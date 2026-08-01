"use strict";

const { FiscalService } = require("../FiscalService");

/**
 * FocusNFeAdapter — Adapter para o provedor Focus NFe
 *
 * Stub: assinatura dos métodos implementada.
 * A lógica real de integração deve ser adicionada aqui quando
 * a integração for contratada.
 *
 * Documentação do provedor: https://focusnfe.com.br/docs
 */

class FocusNFeAdapter extends FiscalService {
  constructor(config) {
    super(config);
    this.provedor = "focusnfe";
    // this.baseUrl = "https://api.focusnfe.com.br/v2"; // descomente ao implementar
    // this.token = config.token_api;
  }

  async transmitir(payload) {
    throw new Error(
      "FocusNFeAdapter.transmitir: não implementado. " +
        "Integração com Focus NFe ainda não foi contratada/configurada.",
    );
  }

  async consultar(chaveOuRequisicao) {
    throw new Error("FocusNFeAdapter.consultar: não implementado.");
  }

  async cancelar(chaveAcesso, motivo) {
    throw new Error("FocusNFeAdapter.cancelar: não implementado.");
  }

  async inutilizar(serie, numeroInicial, numeroFinal, motivo) {
    throw new Error("FocusNFeAdapter.inutilizar: não implementado.");
  }

  async downloadDanfe(chaveAcesso) {
    throw new Error("FocusNFeAdapter.downloadDanfe: não implementado.");
  }

  async downloadXml(chaveAcesso) {
    throw new Error("FocusNFeAdapter.downloadXml: não implementado.");
  }
}

module.exports = FocusNFeAdapter;
