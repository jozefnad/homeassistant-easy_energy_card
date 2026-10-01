/**
 * Easy Energy Card
 * Estimates energy use and electricity cost of any Home Assistant entity directly
 * from its recorder history – no helper entities, no extra integrations.
 *
 * @version 1.0.0
 * @license MIT
 */

const CARD_VERSION = '1.0.0';
const CARD_TAG = 'easy-energy-card';
const EDITOR_TAG = 'easy-energy-card-editor';

const MODES = ['fixed', 'dimmable', 'multi_speed', 'power_sensor'];
const TARIFFS = ['fixed', 'dual', 'spot'];
const PERIODS = ['today', 'yesterday', 'week', 'month', 'this_month', 'custom'];
const OFF_STATES = new Set(['off', 'standby', 'idle', 'closed', 'docked', 'not_home', 'false', 'none', 'sleep']);
const NO_DATA_STATES = new Set(['unavailable', 'unknown', '']);
const CLIMATE_ACTIVE = new Set(['heating', 'cooling', 'drying', 'preheating', 'defrosting']);
const PALETTE = ['#ff9800', '#2196f3', '#4caf50', '#e91e63', '#9c27b0', '#00bcd4', '#ffc107', '#795548', '#607d8b', '#8bc34a'];
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const LIVE_THROTTLE = 3000;
const CACHE_SIZE = 8;

const DEFAULTS = {
  compact: false,
  default_period: 'today',
  periods: ['today', 'yesterday', 'week', 'month', 'custom'],
  show_power: true,
  show_energy: true,
  show_projection: true,
  show_chart: true,
  show_entities: true,
  chart_metric: 'cost',
  price_add: 0,
  price_multiplier: 1,
  low_tariff_weekends: false,
  low_tariff_state: 'on',
};

// ============================================
// Translations
// ============================================

const I18N = {
  en: {
    today: 'Today', yesterday: 'Yesterday', week: '7 days', month: '30 days', this_month: 'This month', custom: 'Custom',
    title_default: 'Energy costs', now: 'now', energy: 'Energy', cost: 'Cost', total: 'Total',
    estimate: 'Estimate', per_month: 'month', per_year: 'year', avg_price: 'Avg. price',
    runtime: 'On', starts: 'starts', breakdown: 'Breakdown', timeline: 'Timeline', from: 'From', to: 'To',
    no_entities: 'Add at least one device in the card editor.', loading: 'Loading history…',
    error: 'Failed to load history', data_from: 'History is available only from', no_history: 'no recorded history',
    unknown_entity: 'entity not found', set_power: 'set power (W)',
    no_price: 'Set the electricity price in the card editor.', no_price_entity: 'Select a price entity in the card editor.',
    no_price_data: 'The price entity has no valid numeric data.', show_breakdown: 'Show breakdown', show_timeline: 'Show timeline',

    e_sec_general: 'General', e_sec_devices: 'Devices', e_sec_pricing: 'Electricity price', e_sec_display: 'Display',
    e_add: 'Add device', e_remove: 'Remove', e_up: 'Move up', e_down: 'Move down',
    title: 'Card title', icon: 'Icon', compact: 'Compact mode (single row)',
    entity: 'Entity', name: 'Name', mode: 'Calculation mode', power: 'Power when on (W)',
    standby_power: 'Standby power (W)', min_power: 'Minimum power (W)', speeds: 'Speed levels',
    attribute: 'Attribute', on_states: 'Active states',
    tariff: 'Tariff type', price: 'Price per kWh', price_high: 'High tariff per kWh', price_low: 'Low tariff per kWh',
    low_tariff_times: 'Low tariff hours', low_tariff_weekends: 'Low tariff all weekend',
    low_tariff_entity: 'Tariff switching entity (optional)', low_tariff_state: 'Entity state meaning low tariff',
    price_entity: 'Price entity', price_add: 'Surcharge per kWh (grid fees…)', price_multiplier: 'Multiplier (e.g. VAT 1.21)',
    currency: 'Currency (empty = from Home Assistant)',
    default_period: 'Default period', periods: 'Period buttons', show_power: 'Show current power',
    show_energy: 'Show energy (kWh)', show_projection: 'Show monthly / yearly estimate', show_chart: 'Show chart',
    show_entities: 'Show device list', chart_metric: 'Chart shows',
    mode_fixed: 'Fixed – on/off', mode_dimmable: 'Dimmable – by brightness',
    mode_multi_speed: 'Multi-speed – by speed / percentage', mode_power_sensor: 'Power sensor – measured W',
    tariff_fixed: 'Fixed price', tariff_dual: 'Dual tariff (high / low)', tariff_spot: 'Dynamic / spot price (entity)',
    metric_cost: 'Cost', metric_energy: 'Energy',
    h_speeds: 'e.g. low:20, medium:40, high:70 or 0:5, 50:30, 100:80 (percent)',
    h_on_states: 'Comma separated, empty = automatic',
    h_low_tariff_times: 'e.g. 22:00-06:00, 13:00-15:00',
    h_attribute: 'Empty = automatic (percentage, preset_mode, fan_mode)',
    h_price_entity: 'Nord Pool, OTE, Tibber, ENTSO-e, input_number… €/MWh and cents are converted automatically',
    h_min_power: 'Consumption at the lowest brightness / speed',
    h_low_tariff_entity: 'When set, it takes precedence over the hours',
    h_low_tariff_state: 'Default: on',
    h_standby_power: 'Consumption while off (TV standby, smart bulb…)',
  },
  sk: {
    today: 'Dnes', yesterday: 'Včera', week: '7 dní', month: '30 dní', this_month: 'Tento mesiac', custom: 'Vlastné',
    title_default: 'Náklady na energiu', now: 'teraz', energy: 'Energia', cost: 'Náklady', total: 'Spolu',
    estimate: 'Odhad', per_month: 'mesiac', per_year: 'rok', avg_price: 'Priem. cena',
    runtime: 'Zapnuté', starts: 'zapnutí', breakdown: 'Rozdelenie', timeline: 'Priebeh', from: 'Od', to: 'Do',
    no_entities: 'Pridajte aspoň jeden spotrebič v editore karty.', loading: 'Načítavam históriu…',
    error: 'Nepodarilo sa načítať históriu', data_from: 'História je dostupná až od', no_history: 'žiadna zaznamenaná história',
    unknown_entity: 'entita neexistuje', set_power: 'nastavte výkon (W)',
    no_price: 'Nastavte cenu elektriny v editore karty.', no_price_entity: 'Vyberte entitu s cenou v editore karty.',
    no_price_data: 'Entita s cenou nemá platné číselné údaje.', show_breakdown: 'Zobraziť rozdelenie', show_timeline: 'Zobraziť priebeh',

    e_sec_general: 'Všeobecné', e_sec_devices: 'Spotrebiče', e_sec_pricing: 'Cena elektriny', e_sec_display: 'Zobrazenie',
    e_add: 'Pridať spotrebič', e_remove: 'Odstrániť', e_up: 'Posunúť hore', e_down: 'Posunúť dole',
    title: 'Názov karty', icon: 'Ikona', compact: 'Kompaktný režim (jeden riadok)',
    entity: 'Entita', name: 'Názov', mode: 'Režim výpočtu', power: 'Výkon pri zapnutí (W)',
    standby_power: 'Pohotovostný výkon (W)', min_power: 'Minimálny výkon (W)', speeds: 'Stupne rýchlosti',
    attribute: 'Atribút', on_states: 'Aktívne stavy',
    tariff: 'Typ tarify', price: 'Cena za kWh', price_high: 'Vysoká tarifa za kWh', price_low: 'Nízka tarifa za kWh',
    low_tariff_times: 'Časy nízkej tarify', low_tariff_weekends: 'Nízka tarifa celý víkend',
    low_tariff_entity: 'Entita prepínania tarify (voliteľné)', low_tariff_state: 'Stav entity pre nízku tarifu',
    price_entity: 'Entita s cenou', price_add: 'Príplatok za kWh (distribúcia, poplatky…)', price_multiplier: 'Násobiteľ (napr. DPH 1,23)',
    currency: 'Mena (prázdne = z Home Assistanta)',
    default_period: 'Predvolené obdobie', periods: 'Tlačidlá období', show_power: 'Zobraziť aktuálny výkon',
    show_energy: 'Zobraziť energiu (kWh)', show_projection: 'Zobraziť odhad na mesiac / rok', show_chart: 'Zobraziť graf',
    show_entities: 'Zobraziť zoznam spotrebičov', chart_metric: 'Graf zobrazuje',
    mode_fixed: 'Fixný – zapnuté/vypnuté', mode_dimmable: 'Stmievateľný – podľa jasu',
    mode_multi_speed: 'Viacstupňový – podľa rýchlosti / %', mode_power_sensor: 'Senzor výkonu – namerané W',
    tariff_fixed: 'Fixná cena', tariff_dual: 'Dvojtarifa (VT / NT)', tariff_spot: 'Dynamická / spotová cena (entita)',
    metric_cost: 'Náklady', metric_energy: 'Energia',
    h_speeds: 'napr. low:20, medium:40, high:70 alebo 0:5, 50:30, 100:80 (percentá)',
    h_on_states: 'Oddelené čiarkou, prázdne = automaticky',
    h_low_tariff_times: 'napr. 22:00-06:00, 13:00-15:00',
    h_attribute: 'Prázdne = automaticky (percentage, preset_mode, fan_mode)',
    h_price_entity: 'Nord Pool, OTE, Tibber, ENTSO-e, input_number… €/MWh a centy sa prepočítajú automaticky',
    h_min_power: 'Spotreba pri najnižšom jase / stupni',
    h_low_tariff_entity: 'Ak je nastavená, má prednosť pred časmi',
    h_low_tariff_state: 'Predvolene: on',
    h_standby_power: 'Spotreba vo vypnutom stave (standby TV, smart žiarovka…)',
  },
  cs: {
    today: 'Dnes', yesterday: 'Včera', week: '7 dní', month: '30 dní', this_month: 'Tento měsíc', custom: 'Vlastní',
    title_default: 'Náklady na energii', now: 'nyní', energy: 'Energie', cost: 'Náklady', total: 'Celkem',
    estimate: 'Odhad', per_month: 'měsíc', per_year: 'rok', avg_price: 'Prům. cena',
    runtime: 'Zapnuto', starts: 'zapnutí', breakdown: 'Rozdělení', timeline: 'Průběh', from: 'Od', to: 'Do',
    no_entities: 'Přidejte alespoň jeden spotřebič v editoru karty.', loading: 'Načítám historii…',
    error: 'Nepodařilo se načíst historii', data_from: 'Historie je dostupná až od', no_history: 'žádná zaznamenaná historie',
    unknown_entity: 'entita neexistuje', set_power: 'nastavte výkon (W)',
    no_price: 'Nastavte cenu elektřiny v editoru karty.', no_price_entity: 'Vyberte entitu s cenou v editoru karty.',
    no_price_data: 'Entita s cenou nemá platná číselná data.', show_breakdown: 'Zobrazit rozdělení', show_timeline: 'Zobrazit průběh',

    e_sec_general: 'Obecné', e_sec_devices: 'Spotřebiče', e_sec_pricing: 'Cena elektřiny', e_sec_display: 'Zobrazení',
    e_add: 'Přidat spotřebič', e_remove: 'Odstranit', e_up: 'Posunout nahoru', e_down: 'Posunout dolů',
    title: 'Název karty', icon: 'Ikona', compact: 'Kompaktní režim (jeden řádek)',
    entity: 'Entita', name: 'Název', mode: 'Režim výpočtu', power: 'Příkon při zapnutí (W)',
    standby_power: 'Pohotovostní příkon (W)', min_power: 'Minimální příkon (W)', speeds: 'Stupně rychlosti',
    attribute: 'Atribut', on_states: 'Aktivní stavy',
    tariff: 'Typ tarifu', price: 'Cena za kWh', price_high: 'Vysoký tarif za kWh', price_low: 'Nízký tarif za kWh',
    low_tariff_times: 'Časy nízkého tarifu', low_tariff_weekends: 'Nízký tarif celý víkend',
    low_tariff_entity: 'Entita přepínání tarifu (volitelné)', low_tariff_state: 'Stav entity pro nízký tarif',
    price_entity: 'Entita s cenou', price_add: 'Příplatek za kWh (distribuce, poplatky…)', price_multiplier: 'Násobitel (např. DPH 1,21)',
    currency: 'Měna (prázdné = z Home Assistanta)',
    default_period: 'Výchozí období', periods: 'Tlačítka období', show_power: 'Zobrazit aktuální příkon',
    show_energy: 'Zobrazit energii (kWh)', show_projection: 'Zobrazit odhad na měsíc / rok', show_chart: 'Zobrazit graf',
    show_entities: 'Zobrazit seznam spotřebičů', chart_metric: 'Graf zobrazuje',
    mode_fixed: 'Pevný – zapnuto/vypnuto', mode_dimmable: 'Stmívatelný – podle jasu',
    mode_multi_speed: 'Vícestupňový – podle rychlosti / %', mode_power_sensor: 'Senzor příkonu – naměřené W',
    tariff_fixed: 'Pevná cena', tariff_dual: 'Dvoutarif (VT / NT)', tariff_spot: 'Dynamická / spotová cena (entita)',
    metric_cost: 'Náklady', metric_energy: 'Energie',
    h_speeds: 'např. low:20, medium:40, high:70 nebo 0:5, 50:30, 100:80 (procenta)',
    h_on_states: 'Oddělené čárkou, prázdné = automaticky',
    h_low_tariff_times: 'např. 22:00-06:00, 13:00-15:00',
    h_attribute: 'Prázdné = automaticky (percentage, preset_mode, fan_mode)',
    h_price_entity: 'Nord Pool, OTE, Tibber, ENTSO-e, input_number… €/MWh a haléře se přepočítají automaticky',
    h_min_power: 'Spotřeba při nejnižším jasu / stupni',
    h_low_tariff_entity: 'Pokud je nastavena, má přednost před časy',
    h_low_tariff_state: 'Výchozí: on',
    h_standby_power: 'Spotřeba ve vypnutém stavu (standby TV, chytrá žárovka…)',
  },
};

function getLang(hass) {
  const l = String(hass?.locale?.language || hass?.language || 'en').toLowerCase().split(/[-_]/)[0];
  return I18N[l] ? l : 'en';
}

function translate(lang, key) {
  return I18N[lang]?.[key] ?? I18N.en[key] ?? key;
}

// ============================================
// Generic helpers
// ============================================

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(',', '.'));
}

function num(v, fallback) {
  const n = toNum(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function safeColor(c) {
  return typeof c === 'string' && /^[#\w\s(),.%-]+$/.test(c) ? c : null;
}

function parseList(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,;\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  return [];
}

/** Accepts {low: 20, high: 70} or "low:20, high:70" → [{key, num, p}] */
function parseSpeeds(v) {
  let pairs = [];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    pairs = Object.entries(v);
  } else if (typeof v === 'string') {
    pairs = v.split(/[,;\n]/).map((x) => x.split(/[:=]/)).filter((x) => x.length === 2);
  }
  return pairs
    .map(([k, p]) => {
      const key = String(k).trim().toLowerCase();
      const n = toNum(key);
      return { key, num: Number.isFinite(n) ? n : null, p: toNum(p) };
    })
    .filter((x) => x.key && Number.isFinite(x.p));
}

/** "22:00-06:00, 13-15" → [{s, e}] in minutes of day */
function parseWindows(v) {
  const list = Array.isArray(v) ? v : String(v || '').split(/[,;\n]/);
  const out = [];
  for (const raw of list) {
    const m = String(raw).trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[:.](\d{2}))?$/);
    if (!m) continue;
    const s = Number(m[1]) * 60 + Number(m[2] || 0);
    const e = Number(m[3]) * 60 + Number(m[4] || 0);
    if (s <= 1440 && e <= 1440 && s !== e) out.push({ s, e });
  }
  return out;
}

function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(t, n) {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d;
}

function toIsoDate(d) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseIsoDate(s) {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function periodRange(period, custom) {
  const today = startOfDay(Date.now());
  const tomorrow = addDays(today, 1);
  switch (period) {
    case 'yesterday':
      return { start: addDays(today, -1).getTime(), end: today.getTime() };
    case 'week':
      return { start: addDays(today, -6).getTime(), end: tomorrow.getTime() };
    case 'month':
      return { start: addDays(today, -29).getTime(), end: tomorrow.getTime() };
    case 'this_month':
      return { start: new Date(today.getFullYear(), today.getMonth(), 1).getTime(), end: tomorrow.getTime() };
    case 'custom': {
      let s = parseIsoDate(custom?.start) || addDays(today, -6);
      let e = parseIsoDate(custom?.end) || today;
      if (s > e) [s, e] = [e, s];
      return { start: s.getTime(), end: addDays(e, 1).getTime() };
    }
    default:
      return { start: today.getTime(), end: tomorrow.getTime() };
  }
}

function fireEvent(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

// ============================================
// Configuration
// ============================================

function inferTariff(c) {
  if (TARIFFS.includes(c.tariff)) return c.tariff;
  if (c.price_entity) return 'spot';
  if (c.price_high !== undefined || c.price_low !== undefined) return 'dual';
  return 'fixed';
}

function normalizeEntities(config) {
  const list = Array.isArray(config.entities) ? config.entities : config.entity ? [config.entity] : [];
  return list
    .map((e) => (typeof e === 'string' ? { entity: e } : e && typeof e === 'object' ? { ...e } : null))
    .filter((e) => e && typeof e.entity === 'string' && e.entity);
}

function normalizeConfig(config) {
  const c = { ...DEFAULTS, ...config };
  delete c.entity;
  c.entities = normalizeEntities(config);
  c.tariff = inferTariff(config);
  const periods = Array.isArray(c.periods) ? c.periods.filter((p) => PERIODS.includes(p)) : [];
  c.periods = periods.length ? PERIODS.filter((p) => periods.includes(p)) : [...DEFAULTS.periods];
  if (!PERIODS.includes(c.default_period) || c.default_period === 'custom') c.default_period = 'today';
  return c;
}

function guessMode(entityId, stateObj) {
  const domain = String(entityId || '').split('.')[0];
  if (domain === 'light') return 'dimmable';
  if (domain === 'fan') return 'multi_speed';
  const attrs = stateObj?.attributes || {};
  if (attrs.device_class === 'power' || ['W', 'kW', 'MW', 'mW'].includes(attrs.unit_of_measurement)) return 'power_sensor';
  return 'fixed';
}

function powerUnitFactor(unit) {
  return { kW: 1000, MW: 1e6, mW: 0.001 }[unit] ?? 1;
}

function priceUnitFactor(unit) {
  const u = String(unit || '').toLowerCase().trim();
  if (!u) return 1;
  if (u.includes('mwh')) return 0.001;
  if (/^(c|ct|cts|cent|cents|p|öre|ore|øre|gr|haléř|haler|hal)\s*\//.test(u)) return 0.01;
  return 1;
}

// ============================================
// Calculation engine
// ============================================

function prepareEntities(config, hass) {
  return config.entities.map((e, i) => {
    const st = hass.states[e.entity];
    return {
      ...e,
      _domain: e.entity.split('.')[0],
      _mode: MODES.includes(e.mode) ? e.mode : guessMode(e.entity, st),
      _state: st,
      _name: e.name || st?.attributes?.friendly_name || e.entity,
      _color: safeColor(e.color) || PALETTE[i % PALETTE.length],
      _onStates: parseList(e.on_states),
      _speeds: parseSpeeds(e.speeds),
      _unitFactor: powerUnitFactor(st?.attributes?.unit_of_measurement),
    };
  });
}

function multiSpeedPower(e, state, a) {
  const maxP = num(e.power, 0);
  const minP = num(e.min_power, 0);
  const speeds = e._speeds;
  const named = speeds.filter((x) => x.num === null);
  const numeric = speeds.filter((x) => x.num !== null).sort((x, y) => x.num - y.num);
  const custom = e.attribute ? a?.[e.attribute] : undefined;

  if (named.length) {
    const candidates = e.attribute ? [custom] : [a?.preset_mode, a?.fan_mode, a?.speed, state];
    for (const c of candidates) {
      if (c === null || c === undefined) continue;
      const hit = named.find((x) => x.key === String(c).toLowerCase());
      if (hit) return hit.p;
    }
  }

  let pct = toNum(e.attribute ? custom : a?.percentage ?? state);
  if (!Number.isFinite(pct)) {
    const all = speeds.map((x) => x.p);
    return all.length && !maxP ? Math.max(...all) : maxP;
  }
  if (numeric.length) {
    if (pct <= numeric[0].num) return numeric[0].p;
    for (let i = 1; i < numeric.length; i++) {
      const a0 = numeric[i - 1];
      const a1 = numeric[i];
      if (pct <= a1.num) return a0.p + ((a1.p - a0.p) * (pct - a0.num)) / (a1.num - a0.num);
    }
    return numeric[numeric.length - 1].p;
  }
  pct = clamp(pct, 0, 100);
  return minP + ((maxP - minP) * pct) / 100;
}

/** Returns { p: watts, active: true | false | null (no data) } */
function powerAt(e, s, a) {
  const state = s === null || s === undefined ? '' : String(s).toLowerCase();
  if (NO_DATA_STATES.has(state)) return { p: 0, active: null };
  const standby = num(e.standby_power, 0);

  if (e._mode === 'power_sensor') {
    const v = toNum(s);
    if (!Number.isFinite(v)) return { p: 0, active: null };
    const p = Math.max(0, v * e._unitFactor);
    return { p, active: p > standby + 1 };
  }

  let active;
  if (e._onStates.length) active = e._onStates.includes(state);
  else if ((e._domain === 'climate' || e._domain === 'water_heater') && a && a.hvac_action !== undefined && a.hvac_action !== null) {
    active = CLIMATE_ACTIVE.has(String(a.hvac_action).toLowerCase());
  } else active = !OFF_STATES.has(state);

  if (!active) return { p: standby, active: false };

  if (e._mode === 'dimmable') {
    const maxP = num(e.power, 0);
    const b = toNum(a?.brightness);
    if (!Number.isFinite(b)) return { p: maxP, active: true };
    const minP = num(e.min_power, 0);
    return { p: minP + (maxP - minP) * clamp(b / 255, 0, 1), active: true };
  }
  if (e._mode === 'multi_speed') return { p: Math.max(0, multiSpeedPower(e, state, a)), active: true };
  return { p: num(e.power, 0), active: true };
}

/** Converts sorted {t, v} change points into contiguous price slices covering [start, end). */
function stepSlices(points, start, end, map) {
  if (!points.length) return null;
  const out = [];
  let cur = points[0].v;
  let from = start;
  for (const pt of points) {
    if (pt.t <= start) {
      cur = pt.v;
      continue;
    }
    if (pt.t >= end) break;
    if (pt.t > from) out.push({ from, to: pt.t, price: map(cur) });
    from = pt.t;
    cur = pt.v;
  }
  out.push({ from, to: end, price: map(cur) });
  return out;
}

function timeTariffSlices(config, start, end, high, low) {
  const windows = parseWindows(config.low_tariff_times);
  const weekends = !!config.low_tariff_weekends;
  const isLow = (t) => {
    const d = new Date(t);
    if (weekends && (d.getDay() === 0 || d.getDay() === 6)) return true;
    const m = d.getHours() * 60 + d.getMinutes();
    return windows.some((w) => (w.s < w.e ? m >= w.s && m < w.e : m >= w.s || m < w.e));
  };
  const pts = new Set([start, end]);
  for (let d = startOfDay(start); d.getTime() < end; d = addDays(d, 1)) {
    if (d.getTime() > start) pts.add(d.getTime());
    for (const w of windows) {
      for (const m of [w.s, w.e]) {
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60).getTime();
        if (t > start && t < end) pts.add(t);
      }
    }
  }
  const sorted = [...pts].sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    out.push({ from: sorted[i], to: sorted[i + 1], price: isLow((sorted[i] + sorted[i + 1]) / 2) ? low : high });
  }
  return out;
}

function buildPriceSlices(config, hass, history, start, end) {
  const whole = (price) => [{ from: start, to: end, price }];

  if (config.tariff === 'spot') {
    const id = config.price_entity;
    if (!id) return { slices: whole(0), warning: 'no_price_entity' };
    const st = hass.states[id];
    const factor = priceUnitFactor(st?.attributes?.unit_of_measurement);
    const add = num(config.price_add, 0);
    const mul = num(config.price_multiplier, 1);
    const conv = (raw) => (raw * factor + add) * mul;
    const points = (history[id] || []).map((x) => ({ t: x.t, v: toNum(x.s) })).filter((x) => Number.isFinite(x.v));
    const slices = stepSlices(points, start, end, conv);
    if (slices) return { slices };
    const cur = toNum(st?.state);
    return Number.isFinite(cur) ? { slices: whole(conv(cur)) } : { slices: whole(0), warning: 'no_price_data' };
  }

  if (config.tariff === 'dual') {
    const high = num(config.price_high, NaN);
    const low = num(config.price_low, high);
    if (!Number.isFinite(high)) return { slices: whole(0), warning: 'no_price' };
    const id = config.low_tariff_entity;
    if (id) {
      const lowState = String(config.low_tariff_state || 'on').toLowerCase();
      const toPoint = (s) => String(s).toLowerCase() === lowState;
      const points = (history[id] || [])
        .filter((x) => !NO_DATA_STATES.has(String(x.s ?? '').toLowerCase()))
        .map((x) => ({ t: x.t, v: toPoint(x.s) }));
      const slices = stepSlices(points, start, end, (isLow) => (isLow ? low : high));
      if (slices) return { slices };
      const cur = hass.states[id]?.state;
      if (cur !== undefined && !NO_DATA_STATES.has(String(cur).toLowerCase())) return { slices: whole(toPoint(cur) ? low : high) };
    }
    return { slices: timeTariffSlices(config, start, end, high, low) };
  }

  const price = num(config.price, NaN);
  return Number.isFinite(price) ? { slices: whole(price) } : { slices: whole(0), warning: 'no_price' };
}

function buildBuckets(start, rangeEnd) {
  const hourly = rangeEnd - start <= 2 * DAY + HOUR;
  const out = [];
  let t = start;
  while (t < rangeEnd && out.length < 1000) {
    const next = hourly ? t + HOUR : addDays(t, 1).getTime();
    out.push({ start: t, end: Math.min(next, rangeEnd) });
    t = next;
  }
  return { hourly, buckets: out };
}

/** Splits [start, end) at every price and bucket boundary. */
function mergeSlices(priceSlices, buckets, start, end) {
  const pts = new Set([start, end]);
  const add = (t) => {
    if (t > start && t < end) pts.add(t);
  };
  priceSlices.forEach((s) => {
    add(s.from);
    add(s.to);
  });
  buckets.forEach((b) => {
    add(b.start);
    add(b.end);
  });
  const sorted = [...pts].sort((x, y) => x - y);
  const out = [];
  let pi = 0;
  let bi = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const mid = (from + to) / 2;
    while (pi < priceSlices.length - 1 && priceSlices[pi].to <= mid) pi++;
    while (bi < buckets.length - 1 && buckets[bi].end <= mid) bi++;
    out.push({ from, to, price: priceSlices[pi]?.price ?? 0, bucket: bi });
  }
  return out;
}

function computeEnergy({ hass, config, history, start, end, rangeEnd }) {
  const ents = prepareEntities(config, hass);
  const { hourly, buckets } = buildBuckets(start, rangeEnd);
  const n = ents.length;
  const rows = buckets.map((b) => ({ ...b, cost: new Array(n).fill(0), energy: new Array(n).fill(0) }));
  const hasSpan = end > start;
  const price = hasSpan ? buildPriceSlices(config, hass, history, start, end) : { slices: [] };
  const slices = hasSpan ? mergeSlices(price.slices, buckets, start, end) : [];

  const results = ents.map((e, idx) => {
    const states = history[e.entity] || [];
    let energy = 0;
    let cost = 0;
    let runtime = 0;
    let starts = 0;
    let prevActive = null;
    let j = 0;
    for (let i = 0; i < states.length; i++) {
      const st = states[i];
      const { p, active } = powerAt(e, st.s, st.a);
      if (active === true && prevActive === false && st.t >= start && st.t < end) starts++;
      if (active !== null) prevActive = active;
      const t0 = Math.max(st.t, start);
      const t1 = Math.min(i + 1 < states.length ? states[i + 1].t : end, end);
      if (t1 <= t0) continue;
      if (active) runtime += t1 - t0;
      if (!(p > 0)) continue;
      while (j < slices.length && slices[j].to <= t0) j++;
      for (let k = j; k < slices.length && slices[k].from < t1; k++) {
        const s = slices[k];
        const overlap = Math.min(t1, s.to) - Math.max(t0, s.from);
        if (overlap <= 0) continue;
        const kwh = (p * overlap) / 3.6e9;
        energy += kwh;
        cost += kwh * s.price;
        rows[s.bucket].energy[idx] += kwh;
        rows[s.bucket].cost[idx] += kwh * s.price;
      }
    }
    const current = e._state ? powerAt(e, e._state.state, e._state.attributes) : { p: 0 };
    return {
      entity: e.entity,
      name: e._name,
      color: e._color,
      mode: e._mode,
      energy,
      cost,
      runtime,
      starts,
      power: current.p,
      missing: !e._state,
      noHistory: !states.length,
      needsPower: e._mode !== 'power_sensor' && !(num(e.power, 0) > 0) && !e._speeds.length,
      firstT: states.length ? states[0].t : null,
    };
  });

  const total = results.reduce(
    (acc, r) => ({ energy: acc.energy + r.energy, cost: acc.cost + r.cost, power: acc.power + r.power }),
    { energy: 0, cost: 0, power: 0 },
  );

  const withData = results.filter((r) => r.firstT !== null);
  const late = withData.filter((r) => r.firstT > start + 60e3).map((r) => r.firstT);
  const coverageFrom = late.length ? Math.max(...late) : null;
  const coveredStart = withData.length ? Math.min(...withData.map((r) => Math.max(r.firstT, start))) : start;
  const span = end - coveredStart;
  const projection = span >= HOUR ? { month: (total.cost / span) * DAY * 30.4, year: (total.cost / span) * DAY * 365 } : null;

  return { entities: results, buckets: rows, hourly, total, projection, coverageFrom, priceWarning: price.warning, start, end, rangeEnd };
}

// ============================================
// History access
// ============================================

const VALID_ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;

async function fetchHistory(hass, ids, attrIds, start, end) {
  const valid = ids.filter((id) => VALID_ENTITY_ID.test(id));
  const withAttrs = valid.filter((id) => attrIds.has(id));
  const plain = valid.filter((id) => !attrIds.has(id));
  const base = {
    type: 'history/history_during_period',
    start_time: new Date(start).toISOString(),
    end_time: new Date(end).toISOString(),
    include_start_time_state: true,
    significant_changes_only: false,
  };
  const calls = [];
  if (withAttrs.length) calls.push(hass.callWS({ ...base, entity_ids: withAttrs, minimal_response: false, no_attributes: false }));
  if (plain.length) calls.push(hass.callWS({ ...base, entity_ids: plain, minimal_response: true, no_attributes: true }));
  const responses = await Promise.all(calls);
  const out = {};
  for (const res of responses) {
    for (const [id, list] of Object.entries(res || {})) {
      out[id] = (list || [])
        .map((x) => ({ s: x.s, a: x.a, t: (x.lu ?? x.lc) * 1000 }))
        .filter((x) => Number.isFinite(x.t))
        .sort((x, y) => x.t - y.t);
    }
  }
  return out;
}

// ============================================
// Card
// ============================================

const CARD_STYLES = `
  :host { display: block; }
  ha-card { padding: 16px; box-sizing: border-box; height: 100%; overflow: hidden; }
  button { font: inherit; }
  .header { display: flex; align-items: center; gap: 10px; }
  .header > ha-icon { color: var(--state-icon-color, var(--primary-color)); }
  .title { flex: 1; min-width: 0; font-size: 16px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .live { display: flex; align-items: center; gap: 2px; font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; }
  .live ha-icon { --mdc-icon-size: 16px; color: var(--warning-color, #ffa600); }
  .periods { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .periods:empty { display: none; }
  .periods button { font-size: 12px; padding: 4px 11px; border-radius: 14px; cursor: pointer; background: transparent;
    color: var(--primary-text-color); border: 1px solid var(--divider-color); transition: background .15s, color .15s; }
  .periods button:hover { border-color: var(--primary-color); }
  .periods button.active { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); }
  .custom { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--secondary-text-color); }
  .custom:empty { display: none; }
  .custom input { font: inherit; font-size: 12px; padding: 3px 6px; border-radius: 6px; color: var(--primary-text-color);
    background: var(--card-background-color, transparent); border: 1px solid var(--divider-color); color-scheme: light dark; }
  .body { margin-top: 12px; transition: opacity .2s; }
  .body.busy { opacity: .5; }
  .summary { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 6px 20px; }
  .cost { font-size: 30px; font-weight: 600; line-height: 1.1; letter-spacing: -.01em; }
  .cost.clickable { cursor: pointer; }
  .metric { display: flex; flex-direction: column; font-size: 11px; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .03em; }
  .metric b { font-size: 15px; font-weight: 500; color: var(--primary-text-color); text-transform: none; letter-spacing: 0; }
  .projection { margin-top: 4px; font-size: 12px; color: var(--secondary-text-color); }
  .section-head { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; font-size: 11px;
    text-transform: uppercase; letter-spacing: .05em; color: var(--secondary-text-color); }
  .toggle { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none;
    border-radius: 50%; background: transparent; color: var(--secondary-text-color); cursor: pointer; }
  .toggle:hover { background: var(--secondary-background-color); color: var(--primary-color); }
  .toggle ha-icon { --mdc-icon-size: 18px; }
  .bars { display: flex; align-items: flex-end; gap: 2px; height: 90px; margin-top: 6px; border-bottom: 1px solid var(--divider-color); }
  .bar { flex: 1; min-width: 2px; height: 100%; display: flex; align-items: flex-end; }
  .bar:hover .stack { filter: brightness(1.15); }
  .stack { width: 100%; display: flex; flex-direction: column-reverse; border-radius: 3px 3px 0 0; overflow: hidden; }
  .stack > div { width: 100%; flex-shrink: 0; }
  .axis { display: flex; gap: 2px; margin-top: 3px; font-size: 10px; color: var(--secondary-text-color); }
  .axis > div { flex: 1; min-width: 2px; white-space: nowrap; overflow: visible; }
  .donut-wrap { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
  .donut { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
  .donut svg { width: 100%; height: 100%; }
  .donut circle { transition: stroke-width .15s; }
  .donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-size: 11px; color: var(--secondary-text-color); pointer-events: none; }
  .donut-center b { font-size: 14px; color: var(--primary-text-color); font-weight: 600; }
  .legend { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
  .lg { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .lg-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lg-pct { font-weight: 500; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .list { margin-top: 12px; display: flex; flex-direction: column; }
  .row { display: flex; align-items: center; gap: 10px; padding: 7px 0; cursor: pointer; border-top: 1px solid var(--divider-color); }
  .row:first-child { border-top: none; }
  .row-main { flex: 1; min-width: 0; }
  .row-name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-sub { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-sub .warn-text { color: var(--warning-color, #ffa600); }
  .share { height: 3px; margin-top: 4px; border-radius: 2px; background: var(--divider-color); overflow: hidden; }
  .share > div { height: 100%; border-radius: 2px; }
  .row-val { display: flex; flex-direction: column; align-items: flex-end; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
  .row-val b { font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
  .notes { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
  .note { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary-text-color); }
  .note ha-icon { --mdc-icon-size: 14px; color: var(--warning-color, #ffa600); flex-shrink: 0; }
  .empty { padding: 8px 0; font-size: 13px; color: var(--secondary-text-color); }

  ha-card.compact { padding: 10px 12px; display: flex; align-items: center; }
  .c-row { display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; cursor: pointer; }
  .c-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }
  .c-main { flex: 1; min-width: 0; }
  .c-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .c-val { display: flex; flex-direction: column; align-items: flex-end; white-space: nowrap; }
  .c-cost { font-size: 16px; font-weight: 600; }
  .c-energy { font-size: 12px; color: var(--secondary-text-color); }
`;

class EasyEnergyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._cache = new Map();
    this._seen = new Map();
    this._custom = { start: toIsoDate(addDays(startOfDay(Date.now()), -6)), end: toIsoDate(startOfDay(Date.now())) };
    this._view = 'chart';
    this._results = null;
    this._entry = null;
    this._loading = false;
    this._error = null;
    this._fetchToken = 0;
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener('change', (ev) => this._onChange(ev));
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const id = ids.find((x) => x.startsWith('light.')) || ids.find((x) => x.startsWith('switch.'));
    return {
      entities: id ? [{ entity: id, mode: guessMode(id, hass.states[id]), power: 10 }] : [],
      tariff: 'fixed',
      price: 0.2,
    };
  }

  setConfig(config) {
    if (!config || typeof config !== 'object') throw new Error('Invalid configuration');
    const c = normalizeConfig(config);
    const dataKey = JSON.stringify([c.entities.map((e) => [e.entity, e.mode]), c.tariff, c.price_entity, c.low_tariff_entity]);
    if (dataKey !== this._dataKey) {
      this._dataKey = dataKey;
      this._cache.clear();
      this._entry = null;
      this._results = null;
    }
    if (!this._config || this._config.default_period !== c.default_period || !c.periods.includes(this._period)) {
      this._period = c.periods.includes(c.default_period) ? c.default_period : c.periods[0];
    }
    this._config = c;
    this._buildSkeleton();
    if (this._hass) this._load();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    if (first) {
      this._buildSkeleton();
      this._load();
      return;
    }
    let changed = false;
    for (const id of this._trackedIds()) {
      const st = hass.states[id];
      if (st !== this._seen.get(id)) {
        this._seen.set(id, st);
        changed = true;
      }
    }
    if (!changed) return;
    if (this._entry?.live) this._appendLive(this._entry);
    this._scheduleCompute(LIVE_THROTTLE);
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._timer = setInterval(() => this._tick(), 60e3);
    if (this._hass && this._config && !this._entry && !this._loading) this._load();
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    clearTimeout(this._computeTimer);
    this._computeTimer = null;
  }

  getCardSize() {
    return this._config?.compact ? 1 : 6;
  }

  getGridOptions() {
    return this._config?.compact ? { columns: 6, rows: 1, min_columns: 4, min_rows: 1 } : { columns: 12, min_columns: 6 };
  }

  // ---------- helpers ----------

  _t(key) {
    return translate(getLang(this._hass), key);
  }

  _locale() {
    return this._hass?.locale?.language || this._hass?.language || navigator.language || 'en';
  }

  _currency() {
    return this._config.currency || this._hass?.config?.currency || 'EUR';
  }

  _fmtNum(v, d) {
    try {
      return new Intl.NumberFormat(this._locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    } catch (_e) {
      return v.toFixed(d);
    }
  }

  _fmtMoney(v, d) {
    const cur = this._currency();
    try {
      return new Intl.NumberFormat(this._locale(), { style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    } catch (_e) {
      return `${this._fmtNum(v, d)} ${cur}`;
    }
  }

  _fmtCost(v) {
    const abs = Math.abs(v);
    const d = Number.isInteger(this._config.decimals) ? this._config.decimals : abs === 0 || abs >= 0.1 ? 2 : abs >= 0.001 ? 3 : 4;
    return this._fmtMoney(v, d);
  }

  _fmtPrice(v) {
    return `${this._fmtMoney(v, Math.abs(v) < 0.01 && v !== 0 ? 4 : 3)}/kWh`;
  }

  _fmtEnergy(v) {
    const d = v === 0 ? 2 : v >= 100 ? 0 : v >= 10 ? 1 : v >= 0.1 ? 2 : 3;
    return `${this._fmtNum(v, d)} kWh`;
  }

  _fmtPower(w) {
    if (w >= 1000) return `${this._fmtNum(w / 1000, 2)} kW`;
    return `${this._fmtNum(w, w > 0 && w < 10 ? 1 : 0)} W`;
  }

  _fmtDuration(ms) {
    const mins = Math.round(ms / 60e3);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
  }

  _fmtTime(t) {
    return new Date(t).toLocaleTimeString(this._locale(), { hour: '2-digit', minute: '2-digit' });
  }

  _fmtDate(t, weekday = false) {
    return new Date(t).toLocaleDateString(this._locale(), weekday ? { weekday: 'short', day: 'numeric', month: 'numeric' } : { day: 'numeric', month: 'numeric' });
  }

  _periodLabel() {
    if (this._period !== 'custom') return this._t(this._period);
    const r = periodRange('custom', this._custom);
    return `${this._fmtDate(r.start)} – ${this._fmtDate(r.end - 1)}`;
  }

  _trackedIds() {
    const c = this._config;
    const ids = new Set(c.entities.map((e) => e.entity));
    if (c.tariff === 'spot' && c.price_entity) ids.add(c.price_entity);
    if (c.tariff === 'dual' && c.low_tariff_entity) ids.add(c.low_tariff_entity);
    return [...ids];
  }

  _attrIds() {
    const ids = new Set();
    for (const e of this._config.entities) {
      const domain = e.entity.split('.')[0];
      const mode = MODES.includes(e.mode) ? e.mode : guessMode(e.entity, this._hass.states[e.entity]);
      if (mode === 'dimmable' || mode === 'multi_speed' || domain === 'climate' || domain === 'water_heater') ids.add(e.entity);
    }
    return ids;
  }

  // ---------- data ----------

  async _load() {
    if (!this._hass || !this._config) return;
    if (!this._config.entities.length) {
      this._entry = null;
      this._results = null;
      this._renderBody();
      return;
    }
    const r = periodRange(this._period, this._custom);
    const key = `${r.start}|${r.end}`;
    const now = Date.now();
    const cached = this._cache.get(key);
    if (cached && (!cached.live || now - cached.syncedAt < 120e3)) {
      this._entry = cached;
      if (cached.live) this._appendLive(cached);
      this._compute();
      return;
    }

    const token = ++this._fetchToken;
    this._loading = true;
    this._error = null;
    this._renderBody();
    try {
      const fetchEnd = Math.min(r.end, now);
      const history = r.start < fetchEnd ? await fetchHistory(this._hass, this._trackedIds(), this._attrIds(), r.start, fetchEnd) : {};
      if (token !== this._fetchToken) return;
      const entry = { key, start: r.start, end: r.end, live: r.end > now, history, syncedAt: Date.now() };
      this._cache.delete(key);
      this._cache.set(key, entry);
      while (this._cache.size > CACHE_SIZE) this._cache.delete(this._cache.keys().next().value);
      this._entry = entry;
      if (entry.live) this._appendLive(entry);
    } catch (err) {
      if (token !== this._fetchToken) return;
      console.error('[easy-energy-card] history fetch failed', err);
      this._error = err?.message || String(err);
      this._entry = null;
    }
    this._loading = false;
    this._compute();
  }

  /** Appends current states newer than the last known history point. */
  _appendLive(entry) {
    let changed = false;
    for (const id of this._trackedIds()) {
      const st = this._hass.states[id];
      if (!st) continue;
      const t = Date.parse(st.last_updated);
      if (!Number.isFinite(t)) continue;
      const list = entry.history[id] || (entry.history[id] = []);
      const last = list[list.length - 1];
      if (!last || t > last.t) {
        list.push({ s: st.state, a: st.attributes, t });
        changed = true;
      }
    }
    entry.syncedAt = Date.now();
    return changed;
  }

  _tick() {
    if (!this._entry || !this._hass) return;
    const r = periodRange(this._period, this._custom);
    if (r.start !== this._entry.start || r.end !== this._entry.end) this._load();
    else if (this._entry.live) this._compute();
  }

  _scheduleCompute(delay) {
    if (this._computeTimer) return;
    this._computeTimer = setTimeout(() => {
      this._computeTimer = null;
      this._compute();
    }, delay);
  }

  _compute() {
    clearTimeout(this._computeTimer);
    this._computeTimer = null;
    const e = this._entry;
    if (!e || !this._hass) {
      this._results = null;
    } else {
      try {
        this._results = computeEnergy({
          hass: this._hass,
          config: this._config,
          history: e.history,
          start: e.start,
          end: Math.min(e.end, Date.now()),
          rangeEnd: e.end,
        });
      } catch (err) {
        console.error('[easy-energy-card] calculation failed', err);
        this._error = err?.message || String(err);
        this._results = null;
      }
    }
    this._renderBody();
  }

  // ---------- events ----------

  _onClick(ev) {
    const el = ev.target.closest?.('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'period') this._setPeriod(el.dataset.period);
    else if (action === 'toggle-view') {
      this._view = this._view === 'donut' ? 'chart' : 'donut';
      this._renderBody();
    } else if (action === 'more-info' && el.dataset.entity) {
      fireEvent(this, 'hass-more-info', { entityId: el.dataset.entity });
    } else if (action === 'cycle') {
      const list = this._config.periods.filter((p) => p !== 'custom');
      if (list.length > 1) this._setPeriod(list[(list.indexOf(this._period) + 1) % list.length]);
      else if (this._config.entities[0]) fireEvent(this, 'hass-more-info', { entityId: this._config.entities[0].entity });
    }
  }

  _onChange(ev) {
    const field = ev.target?.dataset?.custom;
    if (!field || !parseIsoDate(ev.target.value)) return;
    this._custom = { ...this._custom, [field]: ev.target.value };
    this._load();
  }

  _setPeriod(p) {
    if (!PERIODS.includes(p)) return;
    this._period = p;
    this._renderPeriods();
    this._load();
  }

  // ---------- rendering ----------

  _buildSkeleton() {
    const compact = this._config.compact;
    this.shadowRoot.innerHTML = `<style>${CARD_STYLES}</style>
      <ha-card class="${compact ? 'compact' : ''}">
        ${compact ? '<div id="body" class="c-wrap" style="width:100%"></div>' : '<div id="head" class="header"></div><div id="periods" class="periods"></div><div id="custom" class="custom"></div><div id="body" class="body"></div>'}
      </ha-card>`;
    this._renderPeriods();
    this._renderBody();
  }

  _renderPeriods() {
    const root = this.shadowRoot;
    const periods = root.getElementById('periods');
    const custom = root.getElementById('custom');
    if (!periods) return;
    const list = this._config.periods;
    periods.innerHTML = list.length > 1 || this._period === 'custom'
      ? list.map((p) => `<button data-action="period" data-period="${p}" class="${p === this._period ? 'active' : ''}">${esc(this._t(p))}</button>`).join('')
      : '';
    const today = toIsoDate(new Date());
    custom.innerHTML = this._period === 'custom'
      ? `<label>${esc(this._t('from'))} <input type="date" data-custom="start" max="${today}" value="${esc(this._custom.start)}"></label>
         <label>${esc(this._t('to'))} <input type="date" data-custom="end" max="${today}" value="${esc(this._custom.end)}"></label>`
      : '';
  }

  _title() {
    const c = this._config;
    if (c.title) return c.title;
    if (c.entities.length === 1) {
      const e = c.entities[0];
      return e.name || this._hass?.states[e.entity]?.attributes?.friendly_name || e.entity;
    }
    return this._t('title_default');
  }

  _icon() {
    const c = this._config;
    if (c.icon) return c.icon;
    if (c.entities.length === 1) return this._hass?.states[c.entities[0].entity]?.attributes?.icon || 'mdi:lightning-bolt';
    return 'mdi:lightning-bolt';
  }

  _renderBody() {
    const body = this.shadowRoot.getElementById('body');
    if (!body || !this._config) return;
    if (this._config.compact) {
      body.innerHTML = this._renderCompact();
      return;
    }
    const head = this.shadowRoot.getElementById('head');
    const r = this._results;
    const c = this._config;
    head.innerHTML = `<ha-icon icon="${esc(this._icon())}"></ha-icon><div class="title">${esc(this._title())}</div>${
      c.show_power && r ? `<div class="live" title="${esc(this._t('now'))}"><ha-icon icon="mdi:flash"></ha-icon>${esc(this._fmtPower(r.total.power))}</div>` : ''
    }`;
    body.classList.toggle('busy', this._loading && !!r);
    if (!c.entities.length) body.innerHTML = `<div class="empty">${esc(this._t('no_entities'))}</div>`;
    else if (!r && this._error) body.innerHTML = this._note(`${this._t('error')}: ${this._error}`, 'mdi:alert-circle-outline');
    else if (!r) body.innerHTML = `<div class="empty">${esc(this._t('loading'))}</div>`;
    else body.innerHTML = this._renderSummary(r) + this._renderViz(r) + this._renderList(r) + this._renderNotes(r);
  }

  _renderCompact() {
    const r = this._results;
    const c = this._config;
    const active = r && r.total.power > 0;
    const color = active ? 'var(--state-active-color, #ff9800)' : 'var(--state-icon-color, var(--disabled-color, #9e9e9e))';
    const sub = [this._periodLabel()];
    if (r && c.show_power) sub.push(this._fmtPower(r.total.power));
    const cost = r ? this._fmtCost(r.total.cost) : this._error ? '!' : '…';
    return `<div class="c-row" data-action="cycle" title="${esc(this._error || '')}">
      <div class="c-icon" style="--c:${color}"><ha-icon icon="${esc(this._icon())}"></ha-icon></div>
      <div class="c-main"><div class="c-name">${esc(this._title())}</div><div class="c-sub">${esc(sub.join(' · '))}</div></div>
      <div class="c-val"><div class="c-cost">${esc(cost)}</div>${r && c.show_energy ? `<div class="c-energy">${esc(this._fmtEnergy(r.total.energy))}</div>` : ''}</div>
    </div>`;
  }

  _renderSummary(r) {
    const c = this._config;
    const multi = r.entities.length > 1 && c.show_chart;
    const parts = [`<div class="cost ${multi ? 'clickable' : ''}" ${multi ? `data-action="toggle-view" title="${esc(this._t('show_breakdown'))}"` : ''}>${esc(this._fmtCost(r.total.cost))}</div>`];
    if (c.show_energy) parts.push(`<div class="metric"><span>${esc(this._t('energy'))}</span><b>${esc(this._fmtEnergy(r.total.energy))}</b></div>`);
    if (c.tariff !== 'fixed' && r.total.energy > 0) {
      parts.push(`<div class="metric"><span>${esc(this._t('avg_price'))}</span><b>${esc(this._fmtPrice(r.total.cost / r.total.energy))}</b></div>`);
    }
    let html = `<div class="summary">${parts.join('')}</div>`;
    if (c.show_projection && r.projection && r.total.cost > 0) {
      html += `<div class="projection">${esc(this._t('estimate'))}: ~${esc(this._fmtCost(r.projection.month))} / ${esc(this._t('per_month'))} · ~${esc(this._fmtCost(r.projection.year))} / ${esc(this._t('per_year'))}</div>`;
    }
    return html;
  }

  _renderViz(r) {
    if (!this._config.show_chart) return '';
    const multi = r.entities.length > 1;
    const donut = multi && this._view === 'donut';
    const toggle = multi
      ? `<button class="toggle" data-action="toggle-view" title="${esc(this._t(donut ? 'show_timeline' : 'show_breakdown'))}"><ha-icon icon="${donut ? 'mdi:chart-bar' : 'mdi:chart-donut'}"></ha-icon></button>`
      : '';
    const head = `<div class="section-head"><span>${esc(this._t(donut ? 'breakdown' : 'timeline'))}</span>${toggle}</div>`;
    return head + (donut ? this._renderDonut(r) : this._renderBars(r));
  }

  _renderBars(r) {
    const metric = this._config.chart_metric === 'energy' ? 'energy' : 'cost';
    const fmt = (v) => (metric === 'energy' ? this._fmtEnergy(v) : this._fmtCost(v));
    const totals = r.buckets.map((b) => b[metric].reduce((a, v) => a + v, 0));
    const max = Math.max(0, ...totals);
    const step = Math.max(1, Math.ceil(r.buckets.length / 6));
    const label = (b) => (r.hourly ? this._fmtTime(b.start) : this._fmtDate(b.start));
    const bars = r.buckets.map((b, i) => {
      const tot = totals[i];
      const h = max > 0 && tot > 0 ? Math.max(1.5, (tot / max) * 100) : 0;
      const segs = tot > 0
        ? b[metric].map((v, idx) => (v > 0 ? `<div style="height:${(v / tot) * 100}%;background:${r.entities[idx].color}"></div>` : '')).join('')
        : '';
      const range = r.hourly ? `${this._fmtDate(b.start)} ${this._fmtTime(b.start)}–${this._fmtTime(b.end)}` : this._fmtDate(b.start, true);
      const tip = `${range}: ${fmt(tot)}${metric === 'cost' ? ` · ${this._fmtEnergy(b.energy.reduce((a, v) => a + v, 0))}` : ''}`;
      return `<div class="bar" title="${esc(tip)}"><div class="stack" style="height:${h}%">${segs}</div></div>`;
    });
    const axis = r.buckets.map((b, i) => `<div>${i % step === 0 ? esc(label(b)) : ''}</div>`);
    return `<div class="bars">${bars.join('')}</div><div class="axis">${axis.join('')}</div>`;
  }

  _renderDonut(r) {
    const metric = r.total.cost > 0 ? 'cost' : 'energy';
    const total = r.total[metric];
    const fmt = (v) => (metric === 'energy' ? this._fmtEnergy(v) : this._fmtCost(v));
    let cum = 0;
    const arcs = r.entities.map((e) => {
      const pct = total > 0 ? (e[metric] / total) * 100 : 0;
      const arc = pct > 0
        ? `<circle cx="21" cy="21" r="15.9155" fill="none" stroke-width="6" style="stroke:${e.color}" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-cum}"><title>${esc(e.name)}: ${esc(fmt(e[metric]))}</title></circle>`
        : '';
      cum += pct;
      return arc;
    });
    const legend = [...r.entities]
      .sort((a, b) => b[metric] - a[metric])
      .map((e) => {
        const pct = total > 0 ? (e[metric] / total) * 100 : 0;
        return `<div class="lg" data-action="more-info" data-entity="${esc(e.entity)}" title="${esc(fmt(e[metric]))}">
          <span class="dot" style="background:${e.color}"></span><span class="lg-name">${esc(e.name)}</span>
          <span class="lg-pct">${esc(this._fmtNum(pct, pct > 0 && pct < 10 ? 1 : 0))} %</span></div>`;
      });
    return `<div class="donut-wrap">
      <div class="donut"><svg viewBox="0 0 42 42"><g transform="rotate(-90 21 21)">
        <circle cx="21" cy="21" r="15.9155" fill="none" stroke-width="6" style="stroke:var(--divider-color)"></circle>${arcs.join('')}
      </g></svg><div class="donut-center"><b>${esc(fmt(total))}</b><span>${esc(this._t('total'))}</span></div></div>
      <div class="legend">${legend.join('')}</div></div>`;
  }

  _renderList(r) {
    const c = this._config;
    if (!c.show_entities) return '';
    const metric = r.total.cost > 0 ? 'cost' : 'energy';
    const total = r.total[metric];
    const multi = r.entities.length > 1;
    const rows = r.entities.map((e) => {
      const sub = [];
      if (e.missing) sub.push(`<span class="warn-text">${esc(this._t('unknown_entity'))}</span>`);
      else if (e.noHistory) sub.push(`<span class="warn-text">${esc(this._t('no_history'))}</span>`);
      if (e.needsPower && !e.missing) sub.push(`<span class="warn-text">${esc(this._t('set_power'))}</span>`);
      if (e.runtime > 0) sub.push(esc(`${this._t('runtime')} ${this._fmtDuration(e.runtime)}`));
      if (e.starts > 0) sub.push(esc(`${e.starts}× ${this._t('starts')}`));
      if (c.show_power && e.power > 0) sub.push(esc(`${this._fmtPower(e.power)} ${this._t('now')}`));
      const pct = total > 0 ? (e[metric] / total) * 100 : 0;
      return `<div class="row" data-action="more-info" data-entity="${esc(e.entity)}">
        <span class="dot" style="background:${e.color}"></span>
        <div class="row-main"><div class="row-name">${esc(e.name)}</div><div class="row-sub">${sub.join(' · ') || '&nbsp;'}</div>
          ${multi ? `<div class="share"><div style="width:${pct}%;background:${e.color}"></div></div>` : ''}</div>
        <div class="row-val"><b>${esc(this._fmtCost(e.cost))}</b><span>${esc(this._fmtEnergy(e.energy))}</span></div>
      </div>`;
    });
    return `<div class="list">${rows.join('')}</div>`;
  }

  _note(text, icon = 'mdi:information-outline') {
    return `<div class="note"><ha-icon icon="${icon}"></ha-icon><span>${esc(text)}</span></div>`;
  }

  _renderNotes(r) {
    const notes = [];
    if (r.priceWarning) notes.push(this._note(this._t(r.priceWarning), 'mdi:cash-remove'));
    if (r.coverageFrom) notes.push(this._note(`${this._t('data_from')} ${this._fmtDate(r.coverageFrom)} ${this._fmtTime(r.coverageFrom)}`));
    if (this._error) notes.push(this._note(`${this._t('error')}: ${this._error}`, 'mdi:alert-circle-outline'));
    return notes.length ? `<div class="notes">${notes.join('')}</div>` : '';
  }
}

// ============================================
// Visual editor
// ============================================

const EDITOR_STYLES = `
  :host { display: block; }
  .section { margin-bottom: 24px; }
  .sec-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 15px; font-weight: 500; }
  .sec-title ha-icon { color: var(--primary-color); --mdc-icon-size: 20px; }
  ha-expansion-panel { display: block; margin-bottom: 8px; --expansion-panel-content-padding: 0 12px 12px; }
  .panel-body { padding-top: 8px; }
  .actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; }
  .btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px;
    background: transparent; color: var(--primary-text-color); border: 1px solid var(--divider-color); }
  .btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
  .btn.danger:hover { border-color: var(--error-color, #db4437); color: var(--error-color, #db4437); }
  .btn:disabled { opacity: .4; cursor: default; }
  .btn ha-icon { --mdc-icon-size: 18px; }
  .add { margin-top: 4px; }
  .version { font-size: 11px; color: var(--secondary-text-color); text-align: right; }
`;

const ENTITY_FORM_KEYS = ['entity', 'name', 'mode', 'power', 'standby_power', 'min_power', 'speeds', 'attribute', 'on_states'];

function schemaKeys(schema) {
  return schema.flatMap((s) => (s.schema ? schemaKeys(s.schema) : [s.name]));
}

function isEmpty(v) {
  return v === undefined || v === null || v === '';
}

class EasyEnergyCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._panels = [];
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  setConfig(config) {
    this._config = { ...config, entities: normalizeEntities(config) };
    delete this._config.entity;
    this._update();
  }

  _t(key) {
    return translate(getLang(this._hass), key);
  }

  _labelFns() {
    return {
      computeLabel: (s) => this._t(s.name),
      computeHelper: (s) => (I18N.en[`h_${s.name}`] ? this._t(`h_${s.name}`) : undefined),
    };
  }

  // ---------- schemas ----------

  _generalSchema() {
    return [
      { type: 'grid', name: '', schema: [{ name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } }] },
      { name: 'compact', selector: { boolean: {} } },
    ];
  }

  _entitySchema(mode) {
    const w = (name) => ({ name, selector: { number: { min: 0, step: 0.1, mode: 'box', unit_of_measurement: 'W' } } });
    const s = [
      { name: 'entity', required: true, selector: { entity: {} } },
      { name: 'name', selector: { text: {} } },
      { name: 'mode', selector: { select: { mode: 'dropdown', options: MODES.map((m) => ({ value: m, label: this._t(`mode_${m}`) })) } } },
    ];
    if (mode === 'power_sensor') s.push(w('standby_power'));
    else s.push({ type: 'grid', name: '', schema: [w('power'), w('standby_power')] });
    if (mode === 'dimmable' || mode === 'multi_speed') s.push(w('min_power'));
    if (mode === 'multi_speed') s.push({ name: 'speeds', selector: { text: {} } }, { name: 'attribute', selector: { text: {} } });
    if (mode !== 'power_sensor') s.push({ name: 'on_states', selector: { text: {} } });
    return s;
  }

  _pricingSchema(tariff) {
    const unit = `${this._config.currency || this._hass?.config?.currency || 'EUR'}/kWh`;
    const money = (name, min = 0) => ({ name, selector: { number: { ...(min === null ? {} : { min }), step: 0.0001, mode: 'box', unit_of_measurement: unit } } });
    const s = [{ name: 'tariff', selector: { select: { mode: 'dropdown', options: TARIFFS.map((t) => ({ value: t, label: this._t(`tariff_${t}`) })) } } }];
    if (tariff === 'fixed') s.push(money('price'));
    if (tariff === 'dual') {
      s.push(
        { type: 'grid', name: '', schema: [money('price_high'), money('price_low')] },
        { name: 'low_tariff_times', selector: { text: {} } },
        { name: 'low_tariff_weekends', selector: { boolean: {} } },
        { name: 'low_tariff_entity', selector: { entity: { domain: ['binary_sensor', 'input_boolean', 'switch', 'sensor', 'input_select', 'select', 'schedule'] } } },
        { name: 'low_tariff_state', selector: { text: {} } },
      );
    }
    if (tariff === 'spot') {
      s.push(
        { name: 'price_entity', selector: { entity: { domain: ['sensor', 'input_number', 'number'] } } },
        { type: 'grid', name: '', schema: [money('price_add', null), { name: 'price_multiplier', selector: { number: { min: 0, step: 0.01, mode: 'box' } } }] },
      );
    }
    s.push({ name: 'currency', selector: { text: {} } });
    return s;
  }

  _displaySchema() {
    const opt = (p) => ({ value: p, label: this._t(p) });
    return [
      { name: 'default_period', selector: { select: { mode: 'dropdown', options: PERIODS.filter((p) => p !== 'custom').map(opt) } } },
      { name: 'periods', selector: { select: { multiple: true, options: PERIODS.map(opt) } } },
      { name: 'chart_metric', selector: { select: { mode: 'dropdown', options: ['cost', 'energy'].map((m) => ({ value: m, label: this._t(`metric_${m}`) })) } } },
      {
        type: 'grid',
        name: '',
        schema: ['show_power', 'show_energy', 'show_projection', 'show_chart', 'show_entities'].map((name) => ({ name, selector: { boolean: {} } })),
      },
    ];
  }

  // ---------- rendering ----------

  _build() {
    const t = (k) => esc(this._t(k));
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLES}</style>
      <div class="section"><div class="sec-title"><ha-icon icon="mdi:card-text-outline"></ha-icon>${t('e_sec_general')}</div><ha-form id="general"></ha-form></div>
      <div class="section"><div class="sec-title"><ha-icon icon="mdi:power-plug-outline"></ha-icon>${t('e_sec_devices')}</div>
        <div id="entities"></div><div class="add"><ha-form id="add"></ha-form></div></div>
      <div class="section"><div class="sec-title"><ha-icon icon="mdi:cash-multiple"></ha-icon>${t('e_sec_pricing')}</div><ha-form id="pricing"></ha-form></div>
      <div class="section"><div class="sec-title"><ha-icon icon="mdi:palette-outline"></ha-icon>${t('e_sec_display')}</div><ha-form id="display"></ha-form></div>
      <div class="version">Easy Energy Card v${CARD_VERSION}</div>`;
    const $ = (id) => this.shadowRoot.getElementById(id);
    this._forms = { general: $('general'), pricing: $('pricing'), display: $('display'), add: $('add') };
    for (const [key, form] of Object.entries(this._forms)) {
      Object.assign(form, this._labelFns());
      form.addEventListener('value-changed', (ev) => {
        ev.stopPropagation();
        if (key === 'add') this._addEntity(ev.detail.value?.entity);
        else this._formChanged(form.schema, ev.detail.value);
      });
    }
    this._forms.add.schema = [{ name: 'entity', selector: { entity: {} } }];
    this._forms.add.computeLabel = () => this._t('e_add');
    this._forms.add.data = {};
    this._built = true;
    this._builtLang = getLang(this._hass);
  }

  _update() {
    if (!this._config || !this._hass) return;
    if (!this._built || this._builtLang !== getLang(this._hass)) {
      this._built = false;
      this._panels = [];
      this._build();
    }
    const c = this._config;
    const tariff = inferTariff(c);
    const data = { ...DEFAULTS, ...c, tariff };
    const f = this._forms;
    Object.values(f).forEach((form) => {
      form.hass = this._hass;
    });
    f.general.schema = this._generalSchema();
    f.general.data = data;
    f.pricing.schema = this._pricingSchema(tariff);
    f.pricing.data = data;
    f.display.schema = this._displaySchema();
    f.display.data = data;
    this._syncPanels();
  }

  _entityData(e) {
    const d = { ...e, mode: MODES.includes(e.mode) ? e.mode : guessMode(e.entity, this._hass.states[e.entity]) };
    if (e.speeds && typeof e.speeds === 'object') d.speeds = Object.entries(e.speeds).map(([k, v]) => `${k}:${v}`).join(', ');
    if (Array.isArray(e.on_states)) d.on_states = e.on_states.join(', ');
    return d;
  }

  _syncPanels() {
    const list = this.shadowRoot.getElementById('entities');
    const ents = this._config.entities;
    if (this._panels.length !== ents.length) {
      list.innerHTML = '';
      this._panels = ents.map((_e, i) => this._createPanel(i));
      this._panels.forEach((p) => list.appendChild(p.panel));
    }
    ents.forEach((e, i) => {
      const p = this._panels[i];
      const data = this._entityData(e);
      const st = this._hass.states[e.entity];
      p.panel.header = e.name || st?.attributes?.friendly_name || e.entity;
      p.panel.secondary = `${this._t(`mode_${data.mode}`)}${e.power ? ` · ${e.power} W` : ''}`;
      p.form.hass = this._hass;
      if (p.mode !== data.mode) {
        p.form.schema = this._entitySchema(data.mode);
        p.mode = data.mode;
      }
      p.form.data = data;
      p.up.disabled = i === 0;
      p.down.disabled = i === ents.length - 1;
    });
  }

  _createPanel(i) {
    const panel = document.createElement('ha-expansion-panel');
    panel.outlined = true;
    const body = document.createElement('div');
    body.className = 'panel-body';
    const form = document.createElement('ha-form');
    Object.assign(form, this._labelFns());
    form.addEventListener('value-changed', (ev) => {
      ev.stopPropagation();
      this._entityChanged(i, form.schema, ev.detail.value);
    });
    const actions = document.createElement('div');
    actions.className = 'actions';
    const button = (icon, label, cls, handler) => {
      const b = document.createElement('button');
      b.className = `btn ${cls}`;
      b.title = label;
      b.innerHTML = `<ha-icon icon="${icon}"></ha-icon>${cls === 'danger' ? `<span>${esc(label)}</span>` : ''}`;
      b.addEventListener('click', handler);
      actions.appendChild(b);
      return b;
    };
    const up = button('mdi:arrow-up', this._t('e_up'), '', () => this._moveEntity(i, -1));
    const down = button('mdi:arrow-down', this._t('e_down'), '', () => this._moveEntity(i, 1));
    button('mdi:delete-outline', this._t('e_remove'), 'danger', () => this._removeEntity(i));
    body.append(form, actions);
    panel.appendChild(body);
    return { panel, form, up, down, mode: null };
  }

  // ---------- changes ----------

  _formChanged(schema, value) {
    const next = { ...this._config };
    for (const key of schemaKeys(schema)) {
      if (isEmpty(value?.[key])) delete next[key];
      else next[key] = value[key];
    }
    this._config = next;
    this._emit();
  }

  _entityChanged(i, schema, value) {
    const old = this._config.entities[i];
    const next = { ...old };
    for (const key of schemaKeys(schema)) {
      if (isEmpty(value?.[key])) delete next[key];
      else next[key] = value[key];
    }
    if (next.entity && next.entity !== old.entity) {
      const oldGuess = guessMode(old.entity, this._hass.states[old.entity]);
      if (!old.mode || old.mode === oldGuess) next.mode = guessMode(next.entity, this._hass.states[next.entity]);
    }
    const entities = [...this._config.entities];
    entities[i] = next;
    this._config = { ...this._config, entities };
    this._emit();
  }

  _addEntity(id) {
    if (!id) return;
    this._forms.add.data = {};
    const entities = [...this._config.entities, { entity: id, mode: guessMode(id, this._hass.states[id]) }];
    this._config = { ...this._config, entities };
    this._syncPanels();
    this._panels[this._panels.length - 1].panel.expanded = true;
    this._emit();
  }

  _removeEntity(i) {
    const entities = this._config.entities.filter((_e, idx) => idx !== i);
    this._config = { ...this._config, entities };
    this._syncPanels();
    this._emit();
  }

  _moveEntity(i, dir) {
    const j = i + dir;
    const entities = [...this._config.entities];
    if (j < 0 || j >= entities.length) return;
    [entities[i], entities[j]] = [entities[j], entities[i]];
    const [a, b] = [this._panels[i].panel.expanded, this._panels[j].panel.expanded];
    this._panels[i].panel.expanded = b;
    this._panels[j].panel.expanded = a;
    this._config = { ...this._config, entities };
    this._syncPanels();
    this._emit();
  }

  _emit() {
    const src = this._config;
    const out = { type: src.type || `custom:${CARD_TAG}` };
    for (const [k, v] of Object.entries(src)) {
      if (k === 'type' || k === 'entities' || isEmpty(v)) continue;
      if (k in DEFAULTS && JSON.stringify(DEFAULTS[k]) === JSON.stringify(v)) continue;
      out[k] = v;
    }
    out.entities = src.entities.map((e) => {
      const clean = {};
      for (const [k, v] of Object.entries(e)) if (!isEmpty(v)) clean[k] = v;
      return clean;
    });
    fireEvent(this, 'config-changed', { config: out });
  }
}

// ============================================
// Registration
// ============================================

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, EasyEnergyCard);
if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, EasyEnergyCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: 'Easy Energy Card',
    description: 'Energy use and electricity cost of any device calculated from its history – no helper entities needed.',
    preview: true,
    documentationURL: 'https://github.com/jozefnad/homeassistant-easy_energy_card',
  });
}

console.info(`%c EASY-ENERGY-CARD %c v${CARD_VERSION} `, 'color:#fff;background:#ff9800;font-weight:700', 'color:#ff9800;background:#fff');
