/* ==========================================================================
   Arquétipos do Pro Clubs, separados pelos setores do próprio jogo.

   COMO O SETOR DE CADA UM FOI DESCOBERTO
   A tela de Archetypes do jogo mostra 13 ícones divididos em
   Keeper (2), Defender (4), Midfielder (4) e Forward (3).
   Cruzando esses ícones com o que aparece na carta de cada jogador do elenco,
   dá para saber o setor sem chutar. Um detalhe importante: alguns arquétipos
   DIVIDEM o mesmo ícone — THIEF e RECYCLER usam o da reciclagem, SPARK e JOKER
   usam o do raio. Por isso 13 ícones cobrem mais de 13 arquétipos.

   O QUE AINDA FALTA
   Seis ícones continuam sem nome, porque ninguém do elenco tem carta deles:
   os 2 de goleiro, 3 de defesa (punho, engrenagens, escudo) e 1 de ataque (alvo).
   Os arquivos estão em assets/img/arq/ com nomes provisórios — é só descobrir
   o nome e acrescentar aqui embaixo.
   ========================================================================== */

const SETORES = [
  { id: 'gk',  nome: 'Goleiro' },
  { id: 'def', nome: 'Defesa'  },
  { id: 'mid', nome: 'Meio'    },
  { id: 'att', nome: 'Ataque'  },
];

const ICO = 'assets/img/arq/';

const ARQUETIPOS = [
  // ---- goleiro (2 ícones, nenhum nome conhecido ainda) --------------------
  // { nome: '?', setor: 'gk', posicao: 'GK', icone: ICO + 'gk-cadeado.png' },
  // { nome: '?', setor: 'gk', posicao: 'GK', icone: ICO + 'gk-vassoura.png' },

  // ---- defesa (4 ícones, 1 conhecido) ------------------------------------
  { nome: 'PROGRESSOR', setor: 'def', posicao: 'CB', icone: ICO + 'progressor.png' },
  // { nome: '?', setor: 'def', posicao: 'CB', icone: ICO + 'def-punho.png' },
  // { nome: '?', setor: 'def', posicao: 'CB', icone: ICO + 'def-engrenagens.png' },
  // { nome: '?', setor: 'def', posicao: 'CB', icone: ICO + 'def-escudo.png' },

  // ---- meio (4 ícones, 6 arquétipos — dois pares dividem ícone) ----------
  { nome: 'THIEF',    setor: 'mid', posicao: 'CDM', icone: ICO + 'thief-recycler.png' },
  { nome: 'RECYCLER', setor: 'mid', posicao: 'CDM', icone: ICO + 'thief-recycler.png' },
  { nome: 'MAESTRO',  setor: 'mid', posicao: 'CM',  icone: ICO + 'maestro.png' },
  { nome: 'CREATOR',  setor: 'mid', posicao: 'CAM', icone: ICO + 'creator.png' },
  { nome: 'SPARK',    setor: 'mid', posicao: 'RM',  icone: ICO + 'spark-joker.png' },
  { nome: 'JOKER',    setor: 'mid', posicao: 'CAM', icone: ICO + 'spark-joker.png' },

  // ---- ataque (3 ícones, 2 conhecidos) -----------------------------------
  { nome: 'MAGICIAN', setor: 'att', posicao: 'LW', icone: ICO + 'magician.png' },
  { nome: 'FINISHER', setor: 'att', posicao: 'ST', icone: ICO + 'finisher.png' },
  // { nome: '?', setor: 'att', posicao: 'ST', icone: ICO + 'att-alvo.png' },
];

/** 'SPARK+' e 'spark ' viram 'SPARK' — o + é nível da carta, não outro arquétipo. */
function arquetipoBase(nome) {
  return String(nome || '').trim().toUpperCase().replace(/\s*\+\s*$/, '');
}

const ARQUETIPO_POR_NOME = Object.fromEntries(ARQUETIPOS.map(a => [a.nome, a]));

/** Em qual setor esse arquétipo cai. Desconhecido vai para 'outros'. */
function setorDoArquetipo(nome) {
  return ARQUETIPO_POR_NOME[arquetipoBase(nome)]?.setor || 'outros';
}
