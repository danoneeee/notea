export type DescriptorNote = {
  id: string;
  label: string;
};

export type DescriptorGroup = {
  id: string;
  label: string;
  notes: DescriptorNote[];
};

export type DescriptorFamily = {
  id: string;
  label: string;
  color: string;
  groups: DescriptorGroup[];
};

export const descriptorFamilies: DescriptorFamily[] = [
  {
    id: 'floral',
    label: 'Цветы',
    color: '#f3b1cf',
    groups: [
      {
        id: 'white',
        label: 'Белые цветы',
        notes: [
          { id: 'jasmine', label: 'Жасмин' },
          { id: 'orange-blossom', label: 'Флердоранж' },
          { id: 'magnolia', label: 'Магнолия' },
          { id: 'lily', label: 'Лилия' },
        ],
      },
      {
        id: 'garden',
        label: 'Садовые цветы',
        notes: [
          { id: 'rose', label: 'Роза' },
          { id: 'peony', label: 'Пион' },
          { id: 'lilac', label: 'Сирень' },
          { id: 'violet', label: 'Фиалка' },
        ],
      },
      {
        id: 'honeyed',
        label: 'Медовое цветение',
        notes: [
          { id: 'acacia', label: 'Акация' },
          { id: 'linden', label: 'Липовый цвет' },
          { id: 'osmanthus', label: 'Османтус' },
          { id: 'pollen', label: 'Цветочная пыльца' },
        ],
      },
    ],
  },
  {
    id: 'fruity',
    label: 'Фрукты',
    color: '#f7c68b',
    groups: [
      {
        id: 'stone',
        label: 'Косточковые',
        notes: [
          { id: 'apricot', label: 'Абрикос' },
          { id: 'peach', label: 'Персик' },
          { id: 'nectarine', label: 'Нектарин' },
          { id: 'plum', label: 'Слива' },
        ],
      },
      {
        id: 'orchard',
        label: 'Садовые',
        notes: [
          { id: 'apple', label: 'Яблоко' },
          { id: 'pear', label: 'Груша' },
          { id: 'quince', label: 'Айва' },
          { id: 'grape', label: 'Белый виноград' },
        ],
      },
      {
        id: 'berry-tropical',
        label: 'Ягоды и тропики',
        notes: [
          { id: 'lychee', label: 'Личи' },
          { id: 'passionfruit', label: 'Маракуйя' },
          { id: 'raspberry', label: 'Малина' },
          { id: 'blackcurrant', label: 'Черная смородина' },
        ],
      },
    ],
  },
  {
    id: 'sweet',
    label: 'Сладость',
    color: '#f0d978',
    groups: [
      {
        id: 'sugar',
        label: 'Сахара',
        notes: [
          { id: 'rock-candy', label: 'Кандис' },
          { id: 'cane-sugar', label: 'Тростниковый сахар' },
          { id: 'syrup', label: 'Сироп' },
          { id: 'brown-sugar', label: 'Демерара' },
        ],
      },
      {
        id: 'honey-caramel',
        label: 'Мед и карамель',
        notes: [
          { id: 'honey', label: 'Мед' },
          { id: 'caramel', label: 'Карамель' },
          { id: 'toffee', label: 'Ирис' },
          { id: 'condensed-milk', label: 'Сгущенка' },
        ],
      },
      {
        id: 'pastry',
        label: 'Выпечка',
        notes: [
          { id: 'vanilla', label: 'Ваниль' },
          { id: 'biscuit', label: 'Бисквит' },
          { id: 'cookie', label: 'Печенье' },
          { id: 'bun', label: 'Сладкая булочка' },
        ],
      },
    ],
  },
  {
    id: 'herbal',
    label: 'Зелень',
    color: '#a5d69f',
    groups: [
      {
        id: 'fresh-green',
        label: 'Свежая зелень',
        notes: [
          { id: 'cut-grass', label: 'Скошенная трава' },
          { id: 'cucumber', label: 'Огуречная кожура' },
          { id: 'spinach', label: 'Молодой шпинат' },
          { id: 'peas', label: 'Зеленый горошек' },
        ],
      },
      {
        id: 'culinary-herbs',
        label: 'Травы',
        notes: [
          { id: 'mint', label: 'Мята' },
          { id: 'sage', label: 'Шалфей' },
          { id: 'basil', label: 'Базилик' },
          { id: 'thyme', label: 'Тимьян' },
        ],
      },
      {
        id: 'medicinal',
        label: 'Аптечные',
        notes: [
          { id: 'chamomile', label: 'Ромашка' },
          { id: 'eucalyptus', label: 'Эвкалипт' },
          { id: 'camphor', label: 'Камфора' },
          { id: 'wormwood', label: 'Полынь' },
        ],
      },
    ],
  },
  {
    id: 'woody',
    label: 'Дерево',
    color: '#c7ad8f',
    groups: [
      {
        id: 'dry-wood',
        label: 'Сухое дерево',
        notes: [
          { id: 'cedar', label: 'Кедр' },
          { id: 'oak', label: 'Дуб' },
          { id: 'sandal', label: 'Сандал' },
          { id: 'bark', label: 'Кора' },
        ],
      },
      {
        id: 'forest',
        label: 'Лес и подлесок',
        notes: [
          { id: 'moss', label: 'Мох' },
          { id: 'fallen-leaves', label: 'Сухие листья' },
          { id: 'roots', label: 'Коренья' },
          { id: 'wet-forest', label: 'Влажный лес' },
        ],
      },
      {
        id: 'aged-wood',
        label: 'Выдержанное дерево',
        notes: [
          { id: 'old-cabinet', label: 'Старый шкаф' },
          { id: 'cedar-box', label: 'Кедровая шкатулка' },
          { id: 'resin', label: 'Смола' },
          { id: 'camphor-wood', label: 'Камфорное дерево' },
        ],
      },
    ],
  },
  {
    id: 'spicy',
    label: 'Пряности',
    color: '#e8a08d',
    groups: [
      {
        id: 'warm',
        label: 'Теплые пряности',
        notes: [
          { id: 'cinnamon', label: 'Корица' },
          { id: 'clove', label: 'Гвоздика' },
          { id: 'nutmeg', label: 'Мускат' },
          { id: 'allspice', label: 'Душистый перец' },
        ],
      },
      {
        id: 'cool',
        label: 'Освежающие',
        notes: [
          { id: 'cardamom', label: 'Кардамон' },
          { id: 'anise', label: 'Анис' },
          { id: 'licorice', label: 'Лакрица' },
          { id: 'fennel', label: 'Фенхель' },
        ],
      },
      {
        id: 'incense',
        label: 'Благовония',
        notes: [
          { id: 'frankincense', label: 'Ладан' },
          { id: 'agarwood', label: 'Уд' },
          { id: 'resin-incense', label: 'Смолистое благовоние' },
          { id: 'spice-smoke', label: 'Пряный дым' },
        ],
      },
    ],
  },
  {
    id: 'roasted',
    label: 'Обжарка',
    color: '#b9937e',
    groups: [
      {
        id: 'nuts',
        label: 'Орехи',
        notes: [
          { id: 'hazelnut', label: 'Фундук' },
          { id: 'almond', label: 'Миндаль' },
          { id: 'chestnut', label: 'Каштан' },
          { id: 'sesame', label: 'Кунжут' },
        ],
      },
      {
        id: 'toast-cocoa',
        label: 'Тост и какао',
        notes: [
          { id: 'toast', label: 'Поджаренный хлеб' },
          { id: 'cocoa', label: 'Какао' },
          { id: 'dark-chocolate', label: 'Темный шоколад' },
          { id: 'coffee-bean', label: 'Кофейное зерно' },
        ],
      },
      {
        id: 'caramelized',
        label: 'Карамелизация',
        notes: [
          { id: 'burnt-sugar', label: 'Жженый сахар' },
          { id: 'praline', label: 'Пралине' },
          { id: 'molasses', label: 'Патока' },
          { id: 'baked-crust', label: 'Подпеченная корка' },
        ],
      },
    ],
  },
  {
    id: 'mineral',
    label: 'Минералы',
    color: '#b6c7d8',
    groups: [
      {
        id: 'stone',
        label: 'Камень',
        notes: [
          { id: 'wet-stone', label: 'Мокрый камень' },
          { id: 'slate', label: 'Сланец' },
          { id: 'flint', label: 'Кремень' },
          { id: 'pebble', label: 'Галька' },
        ],
      },
      {
        id: 'water',
        label: 'Вода и соль',
        notes: [
          { id: 'spring-water', label: 'Родниковая вода' },
          { id: 'mountain-stream', label: 'Горный ручей' },
          { id: 'saline', label: 'Солоноватость' },
          { id: 'limestone', label: 'Известняк' },
        ],
      },
      {
        id: 'metallic',
        label: 'Металл',
        notes: [
          { id: 'iron', label: 'Железистость' },
          { id: 'copper', label: 'Медь' },
          { id: 'cool-metal', label: 'Холодный металл' },
          { id: 'rain', label: 'Запах дождя' },
        ],
      },
    ],
  },
  {
    id: 'umami',
    label: 'Умами',
    color: '#9bc5b2',
    groups: [
      {
        id: 'broth',
        label: 'Бульонность',
        notes: [
          { id: 'clear-broth', label: 'Прозрачный бульон' },
          { id: 'miso', label: 'Мисо' },
          { id: 'soy', label: 'Соевый соус' },
          { id: 'mushroom-broth', label: 'Грибной отвар' },
        ],
      },
      {
        id: 'marine',
        label: 'Морские',
        notes: [
          { id: 'nori', label: 'Нори' },
          { id: 'kombu', label: 'Комбу' },
          { id: 'iodine', label: 'Йодистость' },
          { id: 'oyster', label: 'Устрица' },
        ],
      },
      {
        id: 'savory-green',
        label: 'Сытная зелень',
        notes: [
          { id: 'edamame', label: 'Эдамаме' },
          { id: 'pumpkin-seed', label: 'Тыквенная семечка' },
          { id: 'boiled-greens', label: 'Пареная зелень' },
          { id: 'sea-beans', label: 'Морская фасоль' },
        ],
      },
    ],
  },
  {
    id: 'aged',
    label: 'Выдержка',
    color: '#9f8978',
    groups: [
      {
        id: 'dried-fruit',
        label: 'Сухофрукты',
        notes: [
          { id: 'date', label: 'Финик' },
          { id: 'fig', label: 'Инжир' },
          { id: 'raisin', label: 'Изюм' },
          { id: 'prune', label: 'Чернослив' },
        ],
      },
      {
        id: 'cellar',
        label: 'Погреб и кожа',
        notes: [
          { id: 'cellar', label: 'Влажный погреб' },
          { id: 'leather', label: 'Кожа' },
          { id: 'tobacco', label: 'Табак' },
          { id: 'mushroom', label: 'Грибница' },
        ],
      },
      {
        id: 'balsamic',
        label: 'Бальзамические',
        notes: [
          { id: 'ginseng', label: 'Женьшень' },
          { id: 'herbal-balm', label: 'Травяной бальзам' },
          { id: 'medicinal-wood', label: 'Лекарственное дерево' },
          { id: 'resinous-sweetness', label: 'Смолистая сладость' },
        ],
      },
    ],
  },
];

export const descriptorWheelFamilies = descriptorFamilies.map(({ id, label, color }) => ({
  id,
  label,
  color,
}));

export function getDescriptorFamilyById(id: string) {
  return descriptorFamilies.find((family) => family.id === id) ?? null;
}

export function getDescriptorGroupById(familyId: string, groupId: string) {
  return getDescriptorFamilyById(familyId)?.groups.find((group) => group.id === groupId) ?? null;
}

export function describeDescriptorPath(id: string) {
  const [familyId, groupId, noteId] = id.split(':');
  const family = getDescriptorFamilyById(familyId);
  const group = family?.groups.find((item) => item.id === groupId);
  const note = group?.notes.find((item) => item.id === noteId);
  if (!family || !group || !note) {
    return { id, shortLabel: id, fullLabel: id, color: '#d9e5d6' };
  }

  return {
    id,
    shortLabel: note.label,
    fullLabel: `${family.label} -> ${group.label} -> ${note.label}`,
    color: family.color,
  };
}

