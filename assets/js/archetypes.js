/* ==========================================================================
   Os 13 arquétipos do Clubs no FC 26, como a EA publica nas Pitch Notes.

   Forward 3 · Midfielder 4 · Defender 4 · Goalkeeper 2 = 13.
   A ordem aqui é a mesma da tela de Archetypes do jogo, e cada ícone foi
   recortado dessa tela (assets/img/arq/).

   VARIANTES
   O nome que aparece na carta nem sempre é o do arquétipo: THIEF e JOKER não
   estão na lista da EA e dividem o ícone de RECYCLER e SPARK. São
   especializações — por isso cada arquétipo tem uma lista `variantes`, e a
   carta cai no arquétipo certo mesmo com outro nome escrito nela.
   Quando aparecer uma variante nova, é só acrescentar no array.
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
  { nome: 'SHOT STOPPER', setor: 'gk', posicao: 'GK', icone: ICO + 'shot-stopper.png',
    desc: 'Seguro no mano a mano, faz as defesas difíceis.',
    playstyles: ['Footwork', 'Far Reach'], variantes: [] },

  { nome: 'SWEEPER KEEPER', setor: 'gk', posicao: 'GK', icone: ICO + 'sweeper-keeper.png',
    desc: 'Goleiro moderno, joga com os pés e sustenta a linha alta.',
    playstyles: ['Cross Claimer', '1v1 Close Down'], variantes: [] },

  // ---- defesa -----------------------------------------------------------
  { nome: 'PROGRESSOR', setor: 'def', posicao: 'CB', icone: ICO + 'progressor.png',
    desc: 'Zagueiro moderno que sai jogando e começa o ataque com passe progressivo.',
    playstyles: ['Long Ball Pass', 'Anticipate'], variantes: [] },

  { nome: 'BOSS', setor: 'def', posicao: 'CB', icone: ICO + 'boss.png',
    desc: 'Ganha a bola no peito, se joga por tudo.',
    playstyles: ['Bruiser', 'Aerial Fortress'], variantes: [] },

  { nome: 'ENGINE', setor: 'def', posicao: 'CB', icone: ICO + 'engine.png',
    desc: 'Fôlego absurdo — mantém o ritmo quando o resto já cansou.',
    playstyles: ['Jockey', 'Relentless'], variantes: [] },

  { nome: 'MARAUDER', setor: 'def', posicao: 'RB/LB', icone: ICO + 'marauder.png',
    desc: 'Especialista defensivo com velocidade, também se vira no ataque.',
    playstyles: ['Whipped Pass', 'Quick Step'], variantes: [] },

  // ---- meio -------------------------------------------------------------
  { nome: 'RECYCLER', setor: 'mid', posicao: 'CDM', icone: ICO + 'recycler.png',
    desc: 'Máquina de passe: tira a bola da defesa e entrega pro atacante.',
    playstyles: ['Press Proven', 'Intercept'], variantes: ['THIEF'] },

  { nome: 'MAESTRO', setor: 'mid', posicao: 'CM', icone: ICO + 'maestro.png',
    desc: 'Comanda o jogo de trás, abre a defesa pros atacantes.',
    playstyles: ['Tiki Taka', 'Pinged Pass'], variantes: [] },

  { nome: 'CREATOR', setor: 'mid', posicao: 'CAM', icone: ICO + 'creator.png',
    desc: 'Passe preciso e incisivo, desmonta defesa organizada.',
    playstyles: ['Incisive Pass', 'Inventive Pass'], variantes: [] },

  { nome: 'SPARK', setor: 'mid', posicao: 'RM/LM', icone: ICO + 'spark.png',
    desc: 'Explosão em espaço curto — chega na linha de fundo e devolve o cruzamento.',
    playstyles: ['Rapid', 'Trickster'], variantes: ['JOKER'] },

  // ---- ataque -----------------------------------------------------------
  { nome: 'MAGICIAN', setor: 'att', posicao: 'LW/RW', icone: ICO + 'magician.png',
    desc: 'Controle, drible e visão: cria chance do nada, pra si e pros outros.',
    playstyles: ['Technical', 'Finesse Shot'], variantes: [] },

  { nome: 'FINISHER', setor: 'att', posicao: 'ST', icone: ICO + 'finisher.png',
    desc: 'Instinto matador na frente do gol, animal no mano a mano com o goleiro.',
    playstyles: ['Low Driven Shot', 'First Touch'], variantes: [] },

  { nome: 'TARGET', setor: 'att', posicao: 'ST', icone: ICO + 'target.png',
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
