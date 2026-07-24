/* ==========================================================================
   Os 13 arquétipos do Clubs no FC 26.

   Forward 3 · Midfielder 4 · Defender 4 · Goalkeeper 2 = 13.
   A ordem aqui é a mesma da tela de Archetypes do jogo, e cada ícone foi
   recortado dessa tela (assets/img/arq/).

   POSIÇÕES
   `posicoes` é a lista "Suggested Positions" que o próprio jogo mostra na tela
   de cada arquétipo — não é chute. É ela que decide se uma carta está na
   posição natural naquele slot do campo.
   `posicao` é só a principal, usada como padrão ao cadastrar uma carta nova.

   VARIANTES
   O nome que aparece na carta nem sempre é o do arquétipo: THIEF e JOKER não
   estão na lista da EA e dividem o ícone de RECYCLER e SPARK. São
   especializações — por isso cada arquétipo tem uma lista `variantes`, e a
   carta cai no arquétipo certo mesmo com outro nome escrito nela.
   ========================================================================== */

const SETORES = [
  { id: 'gk',  nome: 'Goleiro' },
  { id: 'def', nome: 'Defesa'  },
  { id: 'mid', nome: 'Meio'    },
  { id: 'att', nome: 'Ataque'  },
];

const ICO = 'assets/img/arq/';

const ARQUETIPOS = [
  // ---- goleiro ----------------------------------------------------------
  { nome: 'SHOT STOPPER', setor: 'gk', posicao: 'GK', posicoes: ['GK'],
    icone: ICO + 'shot-stopper.png', inspirado: null,
    desc: 'Seguro no mano a mano, faz as defesas difíceis.',
    playstyles: ['Footwork', 'Far Reach'], variantes: [] },

  { nome: 'SWEEPER KEEPER', setor: 'gk', posicao: 'GK', posicoes: ['GK'],
    icone: ICO + 'sweeper-keeper.png', inspirado: null,
    desc: 'Goleiro moderno, joga com os pés e sustenta a linha alta.',
    playstyles: ['Cross Claimer', '1v1 Close Down'], variantes: [] },

  // ---- defesa -----------------------------------------------------------
  { nome: 'PROGRESSOR', setor: 'def', posicao: 'CB', posicoes: ['CB', 'LB', 'RB', 'CDM'],
    icone: ICO + 'progressor.png', inspirado: 'Fernando Hierro',
    desc: 'Zagueiro moderno que sai jogando e começa o ataque com passe progressivo.',
    playstyles: ['Long Ball Pass', 'Anticipate'], variantes: [] },

  { nome: 'BOSS', setor: 'def', posicao: 'CB', posicoes: ['CB', 'LB', 'RB', 'CDM'],
    icone: ICO + 'boss.png', inspirado: 'Nemanja Vidić',
    desc: 'Ganha a bola no peito, se joga por tudo.',
    playstyles: ['Bruiser', 'Aerial Fortress'], variantes: [] },

  { nome: 'ENGINE', setor: 'def', posicao: 'CM',
    posicoes: ['LB', 'RB', 'CDM', 'CM', 'LM', 'RM', 'LW', 'RW'],
    icone: ICO + 'engine.png', inspirado: 'Park Ji Sung',
    desc: 'Fôlego absurdo — mantém o ritmo quando o resto já cansou.',
    playstyles: ['Jockey', 'Relentless'], variantes: [] },

  { nome: 'MARAUDER', setor: 'def', posicao: 'RB/LB',
    posicoes: ['LB', 'RB', 'CDM', 'LM', 'RM'],
    icone: ICO + 'marauder.png', inspirado: 'Cafu',
    desc: 'Especialista defensivo com velocidade, também se vira no ataque.',
    playstyles: ['Whipped Pass', 'Quick Step'], variantes: [] },

  // ---- meio -------------------------------------------------------------
  { nome: 'RECYCLER', setor: 'mid', posicao: 'CDM',
    posicoes: ['CB', 'CDM', 'CM', 'CAM'],
    icone: ICO + 'recycler.png', inspirado: 'Michaël Essien',
    desc: 'Máquina de passe: tira a bola da defesa e entrega pro atacante.',
    playstyles: ['Press Proven', 'Intercept'], variantes: ['THIEF'] },

  { nome: 'MAESTRO', setor: 'mid', posicao: 'CM',
    posicoes: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
    icone: ICO + 'maestro.png', inspirado: 'Toni Kroos',
    desc: 'Comanda o jogo de trás, abre a defesa pros atacantes.',
    playstyles: ['Tiki Taka', 'Pinged Pass'], variantes: [] },

  { nome: 'CREATOR', setor: 'mid', posicao: 'CAM',
    posicoes: ['CM', 'CAM', 'LM', 'RM', 'LW', 'RW'],
    icone: ICO + 'creator.png', inspirado: 'Andrés Iniesta',
    desc: 'Passe preciso e incisivo, desmonta defesa organizada.',
    playstyles: ['Incisive Pass', 'Inventive Pass'], variantes: [] },

  { nome: 'SPARK', setor: 'mid', posicao: 'RM/LM',
    posicoes: ['CAM', 'LM', 'RM', 'LW', 'RW'],
    icone: ICO + 'spark.png', inspirado: 'Luís Figo',
    desc: 'Explosão em espaço curto — chega na linha de fundo e devolve o cruzamento.',
    playstyles: ['Rapid', 'Trickster'], variantes: ['JOKER'] },

  // ---- ataque -----------------------------------------------------------
  { nome: 'MAGICIAN', setor: 'att', posicao: 'LW/RW',
    posicoes: ['CAM', 'LM', 'RM', 'LW', 'RW', 'ST'],
    icone: ICO + 'magician.png', inspirado: 'Ronaldinho',
    desc: 'Controle, drible e visão: cria chance do nada, pra si e pros outros.',
    playstyles: ['Technical', 'Finesse Shot'], variantes: [] },

  { nome: 'FINISHER', setor: 'att', posicao: 'ST',
    posicoes: ['CAM', 'LW', 'RW', 'ST'],
    icone: ICO + 'finisher.png', inspirado: 'Alex Morgan',
    desc: 'Instinto matador na frente do gol, animal no mano a mano com o goleiro.',
    playstyles: ['Low Driven Shot', 'First Touch'], variantes: [] },

  { nome: 'TARGET', setor: 'att', posicao: 'ST',
    posicoes: ['CAM', 'LW', 'RW', 'ST'],
    icone: ICO + 'target.png', inspirado: 'Zlatan Ibrahimović',
    desc: 'Pivô clássico, usa o físico na disputa no chão e pelo alto.',
    playstyles: ['Power Shot', 'Precision Header'], variantes: [] },
];

/** 'SPARK+' e 'spark ' viram 'SPARK' — o + é nível da carta, não outro arquétipo. */
function arquetipoBase(nome) {
  return String(nome || '').trim().toUpperCase().replace(/\s*\+\s*$/, '');
}

/* nome escrito na carta -> arquétipo oficial (cobre também as variantes) */
const ARQUETIPO_POR_NOME = {};
ARQUETIPOS.forEach(a => {
  ARQUETIPO_POR_NOME[a.nome] = a;
  (a.variantes || []).forEach(v => { ARQUETIPO_POR_NOME[v] = a; });
});

/** O arquétipo oficial de uma carta, seja qual for o nome escrito nela. */
function arquetipoDaCarta(nome) {
  return ARQUETIPO_POR_NOME[arquetipoBase(nome)] || null;
}

/** Em qual setor esse arquétipo cai. Desconhecido vai para 'outros'. */
function setorDoArquetipo(nome) {
  return arquetipoDaCarta(nome)?.setor || 'outros';
}

/** Onde essa carta joga bem, segundo o jogo. Cai na posição escrita se o
    arquétipo for desconhecido. */
function posicoesDaCarta(carta) {
  const a = arquetipoDaCarta(carta?.archetype);
  if (a?.posicoes?.length) return a.posicoes;
  return String(carta?.position || '').split('/').map(s => s.trim().toUpperCase()).filter(Boolean);
}
