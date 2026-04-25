const { Usuario, Empresa, sequelize } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  gerarTokenUsuario,
  isEmpresaBloqueada,
  extractEmpresaId,
} = require("../middleware/authUser");
const {
  verificarLimiteAcessos,
  registrarSessao,
} = require("./acessosController");

// Login de usuário
exports.login = async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    console.log("🔐 Tentativa de login:", usuario);
    console.log("📦 Dados recebidos:", {
      usuario,
      senha: senha ? "***" : "vazio",
    });

    // Validar dados
    if (!usuario || !senha) {
      console.log("⚠️  Dados incompletos na tentativa de login");
      return res
        .status(400)
        .json({ mensagem: "Usuário/Email e senha são obrigatórios" });
    }

    // Verificar se é um email (contém @)
    const isEmail = usuario.includes("@");

    let usuarioEncontrado = null;
    let loginViaEmpresa = false;

    if (isEmail) {
      // Primeiro: buscar usuário diretamente pelo campo 'usuario' (email)
      console.log("👤 Tentando login direto via email do usuário:", usuario);
      usuarioEncontrado = await Usuario.findOne({
        where: { usuario: usuario },
      });

      // Fallback: buscar via email da empresa (fluxo legado)
      if (!usuarioEncontrado) {
        console.log(
          "🏢 Usuário não encontrado direto, tentando via email da empresa:",
          usuario,
        );
        const empresa = await Empresa.findOne({
          where: { email: usuario },
        });

        if (empresa) {
          console.log("✅ Empresa encontrada:", empresa.nome);
          // Encontrar usuário ativo vinculado especificamente a esta empresa (campo `empresas`)
          const usuariosAtivos = await Usuario.findAll({
            where: { ativo: true },
            order: [["id", "ASC"]],
          });
          usuarioEncontrado = usuariosAtivos.find((u) => {
            const arr = Array.isArray(u.empresas) ? u.empresas : [];
            return arr.some((item) => {
              if (item == null) return false;
              if (typeof item === "number")
                return Number(item) === Number(empresa.id);
              if (typeof item === "string")
                return String(item) === String(empresa.id);
              if (typeof item === "object") {
                const raw = item.id !== undefined ? item.id : item.empresaId;
                return raw != null && Number(raw) === Number(empresa.id);
              }
              return false;
            });
          });

          if (usuarioEncontrado) {
            loginViaEmpresa = true;
            console.log(
              "✅ Usando usuário vinculado à empresa:",
              usuarioEncontrado.nome,
            );
          } else {
            console.log(
              "⚠️ Nenhum usuário vinculado à empresa encontrado (login via email da empresa)",
            );
          }
        } else {
          console.log(
            "⚠️  Nenhum usuário ou empresa encontrado com email:",
            usuario,
          );
        }
      } else {
        console.log(
          "✅ Usuário encontrado diretamente pelo email:",
          usuarioEncontrado.nome,
        );
      }
    } else {
      // Buscar usuário pelo nome de usuário
      console.log("👤 Tentando login via nome de usuário:", usuario);
      usuarioEncontrado = await Usuario.findOne({
        where: { usuario: usuario },
      });
    }

    if (!usuarioEncontrado) {
      console.log("⚠️  Usuário/Email não encontrado:", usuario);
      return res
        .status(401)
        .json({ mensagem: "Usuário/Email ou senha inválidos" });
    }

    // Verificar se usuário está ativo
    if (!usuarioEncontrado.ativo) {
      console.log("⚠️  Usuário inativo:", usuarioEncontrado.usuario);
      return res.status(401).json({
        mensagem: "Usuário inativo. Entre em contato com o administrador.",
      });
    }

    // Verificar senha
    let senhaValida = false;

    console.log(
      "🔍 Verificando senha para usuário:",
      usuarioEncontrado.usuario,
    );
    console.log(
      "🔍 Hash armazenado no banco:",
      usuarioEncontrado.senha
        ? usuarioEncontrado.senha.substring(0, 20) + "..."
        : "VAZIO",
    );

    // Comparar senha com hash do banco
    try {
      senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
      console.log("🔑 Comparação de senha hash:", senhaValida);
    } catch (bcryptError) {
      console.error("❌ Erro ao comparar senha:", bcryptError);
      senhaValida = false;
    }

    if (!senhaValida) {
      console.log("⚠️  Senha inválida");
      return res
        .status(401)
        .json({ mensagem: "Usuário/Email ou senha inválidos" });
    }

    console.log("✅ Login bem-sucedido para usuário:", usuarioEncontrado.nome);

    // Verificar se empresa está bloqueada antes de completar o login
    const _empresas = Array.isArray(usuarioEncontrado.empresas)
      ? usuarioEncontrado.empresas
      : [];
    const _empresaId = extractEmpresaId(_empresas);
    if (_empresaId && (await isEmpresaBloqueada(_empresaId))) {
      console.log("🚫 Empresa bloqueada para usuário:", usuarioEncontrado.nome);
      return res.status(403).json({
        mensagem:
          "Sistema bloqueado por falta de pagamento. Entre em contato com o suporte.",
        bloqueado: true,
      });
    }

    // Verificar limite de acessos simultâneos
    const limiteCheck = await verificarLimiteAcessos(_empresaId);

    // Se há sessões para derrubar (limite excedido), derrubá-las antes de registrar a nova
    if (limiteCheck.sessoesDerrubar && limiteCheck.sessoesDerrubar.length > 0) {
      console.log(
        `⚡ Derrubando ${limiteCheck.sessoesDerrubar.length} sessão(ões) antiga(s) para empresa ${_empresaId}`,
      );
      const { SessaoAtiva } = require("../models");
      for (const sessao of limiteCheck.sessoesDerrubar) {
        await SessaoAtiva.update(
          { ativo: false },
          { where: { id: sessao.id, ativo: true } },
        );
      }
    }

    // Gerar JWT com empresaId e configurar cookie
    const token = gerarTokenUsuario(usuarioEncontrado.toJSON());

    // Registrar sessão ativa no banco
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.ip ||
      "";
    const userAgent = req.headers["user-agent"] || "";

    if (limiteCheck.empresaPainelId) {
      await registrarSessao(
        usuarioEncontrado.id,
        limiteCheck.empresaPainelId,
        tokenHash,
        typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "",
        userAgent,
      );
      console.log(
        `📝 Sessão registrada para usuário ${usuarioEncontrado.id} na empresa painel ${limiteCheck.empresaPainelId}`,
      );
    }

    // Cookie HttpOnly (seguro) — enviado automaticamente pelo navegador
    res.cookie("pethub_token", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 8 * 60 * 60 * 1000, // 8 horas
      path: "/",
    });

    // Remover senha antes de retornar
    const usuarioData = usuarioEncontrado.toJSON();
    delete usuarioData.senha;

    console.log("📤 Enviando resposta:", {
      id: usuarioData.id,
      nome: usuarioData.nome,
    });

    // Retornar token também no body para clientes que usam Authorization header
    return res.status(200).json({ ...usuarioData, token });
  } catch (error) {
    console.error("ERRO LOGIN:", error);
    // Retornar mensagem e stack para facilitar diagnóstico (remover em produção se necessário)
    return res.status(500).json({
      mensagem: "Erro ao fazer login",
      erro: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : null,
    });
  }
};

// Listar usuários da empresa do usuário logado
exports.listarUsuarios = async (req, res) => {
  try {
    const empresaId = req.user && req.user.empresaId;
    if (!empresaId) {
      return res.status(400).json({ erro: "Empresa não identificada" });
    }

    // Suportar ambos os formatos: número [3] e objeto [{"id":"3",...}]
    const targetNum = JSON.stringify(empresaId);
    const targetStr = JSON.stringify(String(empresaId));
    const [usuarios] = await sequelize.query(
      `SELECT * FROM usuarios WHERE JSON_CONTAINS(empresas, ?) OR JSON_CONTAINS(empresas, JSON_OBJECT('id', ?)) ORDER BY nome ASC`,
      { replacements: [targetNum, targetStr] },
    );

    // Remover senha de cada usuário
    const resultado = usuarios.map((u) => {
      const { senha, ...rest } = u;
      return rest;
    });

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ erro: "Erro ao listar usuários" });
  }
};

// Buscar usuário por ID
exports.buscarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // Remover senha antes de retornar
    const usuarioData = usuario.toJSON();
    delete usuarioData.senha;

    // Normalizar campo `empresas` garantindo formato consistente
    // Resultado final: usuarioData.empresas = [{ id, nomeFantasia?, razaoSocial?, ... }, ...]
    try {
      let raw = usuarioData.empresas;
      let arr = [];
      if (Array.isArray(raw)) {
        arr = raw.slice();
      } else if (typeof raw === "string" && raw.length > 0) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) arr = parsed;
        } catch (e) {
          // fallback: tentar split por vírgula de ids
          arr = raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      // Extrair ids numéricos possíveis
      const empresaIds = arr
        .map((item) => {
          if (item == null) return null;
          if (typeof item === "number") return Number(item);
          if (typeof item === "string") {
            const n = parseInt(item, 10);
            return isNaN(n) ? null : n;
          }
          if (typeof item === "object") {
            const rawId =
              item.id || item.ID || item.empresaId || item.companyId;
            const n = parseInt(String(rawId || ""), 10);
            return isNaN(n) ? null : n;
          }
          return null;
        })
        .filter((v) => v != null && !isNaN(v));

      // Se encontramos ids, buscar as empresas e sobrescrever o array com objetos ricos
      if (empresaIds.length > 0) {
        try {
          const empresasDoBanco = await Empresa.findAll({
            where: { id: empresaIds },
            attributes: ["id", "nome", "razaoSocial", "cnpj", "email"],
          });
          if (empresasDoBanco && empresasDoBanco.length > 0) {
            // Manter a ordem original de empresaIds
            const empresasMap = new Map();
            empresasDoBanco.forEach((e) => {
              const obj = e.toJSON();
              // mapear nome -> nomeFantasia para compatibilidade com frontend
              obj.nomeFantasia = obj.nome || obj.nomeFantasia || null;
              empresasMap.set(Number(e.id), obj);
            });
            usuarioData.empresas = empresaIds
              .map((id) => empresasMap.get(Number(id)) || { id })
              .filter(Boolean);
          } else {
            // Nenhuma empresa encontrada: transformar ids em objetos simples
            usuarioData.empresas = empresaIds.map((id) => ({ id }));
          }
        } catch (e) {
          // Em caso de erro ao buscar empresas, garantir formato mínimo
          usuarioData.empresas = empresaIds.map((id) => ({ id }));
        }
      } else {
        // Não havia ids: garantir que `empresas` seja array (vazio)
        usuarioData.empresas = Array.isArray(arr) ? arr : [];
      }
    } catch (e) {
      // Garantir estrutura de fallback
      usuarioData.empresas = usuarioData.empresas || [];
    }

    res.json(usuarioData);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ erro: "Erro ao buscar usuário" });
  }
};

// Criar usuário
exports.criarUsuario = async (req, res) => {
  try {
    const dados = req.body;

    console.log(
      "📝 Dados recebidos para criar usuário:",
      JSON.stringify(dados, null, 2),
    );

    // Verificar se usuário já existe
    const usuarioExistente = await Usuario.findOne({
      where: { usuario: dados.usuario },
    });

    if (usuarioExistente) {
      console.log("⚠️  Usuário já existe:", dados.usuario);
      return res.status(400).json({ erro: "Nome de usuário já existe" });
    }

    // Criar usuário
    console.log("➕ Criando novo usuário...");
    const novoUsuario = await Usuario.create(dados);
    console.log("✅ Usuário criado com sucesso:", novoUsuario.id);

    // Remover senha antes de retornar
    const usuarioData = novoUsuario.toJSON();
    delete usuarioData.senha;

    res.status(201).json(usuarioData);
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
    console.error("Stack trace:", error.stack);
    console.error("Mensagem de erro:", error.message);
    if (error.errors) {
      console.error(
        "Erros de validação:",
        error.errors.map((e) => ({ field: e.path, message: e.message })),
      );
    }
    res.status(500).json({
      erro: "Erro ao criar usuário",
      detalhes: error.message,
      validacao: error.errors
        ? error.errors.map((e) => ({ field: e.path, message: e.message }))
        : null,
    });
  }
};

// Atualizar usuário
exports.atualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    const dados = req.body;

    console.log("📦 Dados recebidos para atualização:", {
      ...dados,
      senha: dados.senha ? "***" : "não fornecida",
    });

    // A senha será criptografada automaticamente pelo hook beforeUpdate do model
    // Se não foi fornecida senha, remover do objeto para não atualizar
    if (!dados.senha || !dados.senha.trim()) {
      console.log("⚠️ Nenhuma senha fornecida, mantendo senha atual");
      delete dados.senha;
    } else {
      console.log("🔐 Nova senha será criptografada pelo model hook");
    }

    // Se o nome de usuário mudou, verificar se não existe outro com o mesmo nome
    if (dados.usuario && dados.usuario !== usuario.usuario) {
      const usuarioExistente = await Usuario.findOne({
        where: {
          usuario: dados.usuario,
          id: { [Op.ne]: req.params.id },
        },
      });

      if (usuarioExistente) {
        return res.status(400).json({ erro: "Nome de usuário já existe" });
      }
    }

    // Atualizar usuário
    await usuario.update(dados);

    // Remover senha antes de retornar
    const usuarioData = usuario.toJSON();
    delete usuarioData.senha;

    res.json(usuarioData);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ erro: "Erro ao atualizar usuário" });
  }
};

// Deletar usuário
exports.deletarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    await usuario.destroy();
    res.json({ mensagem: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ erro: "Erro ao deletar usuário" });
  }
};

// Validar senha do usuário
exports.validarSenha = async (req, res) => {
  try {
    const { usuarioId, senha } = req.body;

    console.log("🔐 Validando senha para usuário ID:", usuarioId);

    if (!usuarioId || !senha) {
      return res.status(400).json({
        erro: "ID do usuário e senha são obrigatórios",
        valida: false,
      });
    }

    const usuario = await Usuario.findByPk(usuarioId);

    if (!usuario) {
      console.log("⚠️  Usuário não encontrado:", usuarioId);
      return res
        .status(404)
        .json({ erro: "Usuário não encontrado", valida: false });
    }

    // Comparar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    console.log("🔑 Senha válida:", senhaValida);

    return res.status(200).json({ valida: senhaValida });
  } catch (error) {
    console.error("❌ Erro ao validar senha:", error);
    return res
      .status(500)
      .json({ erro: "Erro ao validar senha", valida: false });
  }
};
