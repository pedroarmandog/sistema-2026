// SHIM: Desabilitar localStorage em toda a aplicação (leitura retorna null, escrita é no-op)
// Motivo: migrando armazenamento para banco de dados; evitar uso acidental de localStorage.
(function disableLocalStorageShim(){
    try {
        const fake = {
            getItem: function(){ return null; },
            setItem: function(){ /* noop */ },
            removeItem: function(){ /* noop */ },
            clear: function(){ /* noop */ }
        };
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            enumerable: true,
            get: function(){
                console.warn('[localStorage disabled] access blocked');
                return fake;
            }
        });
        console.info('[init] localStorage shim installed — all reads/writes are now disabled');
    } catch(e) { console.debug('disableLocalStorageShim failed', e); }
})();

// 🧩 Seleciona os elementos do HTML pelos seus IDs
// "formCliente" → formulário de cadastro de cliente
// "listaClientes" → elemento (ul, div, etc.) onde os clientes serão listados
// "formPet" → formulário de cadastro de pet
const form = document.getElementById("formCliente")
const lista = document.getElementById("listaClientes")
const formPet = document.getElementById('formPet')


// 🧠 EVENTO 1: Quando o formulário de cliente for enviado...
// - Previne o recarregamento da página (e.preventDefault())
// - Pega os dados do formulário com FormData()
// - Envia os dados via requisição POST para o backend
// - Recebe a resposta e chama a função para listar os clientes novamente
form.addEventListener("submit", async (e) => {
    e.preventDefault()
    const formData = new FormData(form)

    const res = await fetch("http://localhost:3000/api/clientes", {
        method: "POST",
        body: formData
    });
    const data = await res.json()
    console.log(data)
    listarClientes()
});


// 🧾 FUNÇÃO: listarClientes()
// - Busca todos os clientes cadastrados na API (GET /api/clientes)
// - Limpa a lista atual no HTML
// - Cria um <li> para cada cliente retornado e adiciona ao elemento 'lista'
async function listarClientes() {
    const res = await fetch("http://localhost:3000/api/clientes")
    const clientes = await res.json()

    // Limpa a lista antes de adicionar novamente
    lista.innerHTML = ""

     // Para cada cliente, cria um item de lista e mostra nome + emai
    clientes.forEach(c => {
        const li = document.createElement("li")
        li.textContent = `${c.nome} - ${c.email}`
        lista.appendChild(li)
    })
}


// 🐶 EVENTO 2: Quando o formulário de pet for enviado...
// - Impede o recarregamento da página
// - Pega todos os dados (inclusive arquivos, como imagem) com FormData()
// - Envia via POST para a rota /api/pets da API
// - Exibe o retorno no console
formPet.addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(formPet)

     // Envia o pet para o backend
    const res = await fetch('http://localhost:3000/api/pets', {
        method: 'POST',
        body: formData,
    })

    // Converte a resposta em JSON
    const data = await res.json()
    console.log(data)
})

// Listar clientes ao carregar a página
listarClientes()
