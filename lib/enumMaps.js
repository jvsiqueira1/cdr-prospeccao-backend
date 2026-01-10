export const origemMap = {
  toBackend: {
    Anuncio: "Anuncio",
    "Anúncio": "Anuncio",
    Indicacao: "Indicacao",
    "Indicação": "Indicacao",
    Organico: "Organico",
    "Orgânico": "Organico",
  },
  toFrontend: {
    Anuncio: "Anúncio",
    Indicacao: "Indicação",
    Organico: "Orgânico",
  },
};

export const statusMap = {
  toBackend: {
    "Falar Hoje": "FalarHoje",
    "Em Dia": "EmDia",
  },
  toFrontend: {
    FalarHoje: "Falar Hoje",
    EmDia: "Em Dia",
  },
};

export const prioridadeMap = {
  toBackend: {
    "Atenção": "Atencao",
  },
  toFrontend: {
    Atencao: "Atenção",
  },
};

export const tipoContatoMap = {
  toBackend: {
    "Ligação": "Ligacao",
    "Reunião": "Reuniao",
  },
  toFrontend: {
    Ligacao: "Ligação",
    Reuniao: "Reunião",
  },
};

const toBackend = (map, value) => map.toBackend[value] ?? value;
const toFrontend = (map, value) => map.toFrontend[value] ?? value;

export const normalizeOrigem = {
  toBackend: (value) => toBackend(origemMap, value),
  toFrontend: (value) => toFrontend(origemMap, value),
};

export const normalizeStatus = {
  toBackend: (value) => toBackend(statusMap, value),
  toFrontend: (value) => toFrontend(statusMap, value),
};

export const normalizePrioridade = {
  toBackend: (value) => toBackend(prioridadeMap, value),
  toFrontend: (value) => toFrontend(prioridadeMap, value),
};

export const normalizeTipoContato = {
  toBackend: (value) => toBackend(tipoContatoMap, value),
  toFrontend: (value) => toFrontend(tipoContatoMap, value),
};
