# Easy Energy Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/jozefnad/homeassistant-easy_energy_card.svg)](https://github.com/jozefnad/homeassistant-easy_energy_card/releases)

If you find this card useful, you can buy me a beer to help keep development going.

[![Buy me a beer](https://img.shields.io/badge/Donate-Buy%20me%20a%20beer-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/jozefnad)

**Easy Energy Card** shows how much energy any device used and **how much it cost** – calculated on the fly from the entity's history in the Home Assistant recorder.

Unlike Powercalc, template sensors or utility meters, it **does not create any entities, helpers or integrations**. Add the card, pick a device, enter its wattage and you immediately see today's, yesterday's or last month's cost – including the history *before* you added the card (as far as your recorder keeps it).

## ✨ Features

### Configuration
- 🖱️ **Visual editor** – everything can be configured in the UI, no YAML required
- 🧩 **Multi-entity devices** – combine several entities into one card (hot tub = pump + heater + light) and see the total and the share of each part
- ⚙️ **4 calculation modes**
  - **Fixed** – X W while on (pumps, TVs, coffee machines, heaters…)
  - **Dimmable** – scales with the `brightness` attribute (lights), optional minimum power
  - **Multi-speed** – by `percentage` or named levels `low/medium/high` (fans, heat recovery units, climate fan modes)
  - **Power sensor** – uses a real W/kW sensor (smart plugs) – no need for Riemann integral + utility meter helpers
- 💤 **Standby power** – consumption while off (1 W TV standby = ~9 kWh a year)
- 🤖 **Smart defaults** – mode is auto-detected by domain (light → dimmable, fan → multi-speed, W sensor → power sensor); `climate` / `water_heater` entities respect `hvac_action` (only *heating/cooling* counts as on)

### Pricing
- 💶 **Fixed price**
- 🌗 **Dual tariff** – high/low price with time windows (e.g. `22:00-06:00, 13:00-15:00`), optional "low tariff all weekend", or a switching entity (HDO / ripple control signal, `binary_sensor`, `input_boolean`, `schedule`…)
- 📈 **Dynamic / spot prices** – any price entity (Nord Pool, OTE, Tibber, ENTSO-e, Octopus, `input_number`…). Each minute of consumption is matched with the price that was valid at that exact moment – works with hourly as well as **15-minute** prices
  - `€/MWh` and cent units (`c/kWh`, `ct/kWh`, `öre/kWh`…) are converted automatically
  - **Surcharge** (distribution, fees) and **multiplier** (VAT) on top of the spot price

### Dashboard
- 📅 **Period selector** – Today / Yesterday / 7 days / 30 days / This month / Custom date range
- 📊 **Stacked timeline chart** – hourly bars for day views, daily bars for longer periods, colored per device
- 🍩 **Donut chart** – click the total (or the chart icon) to see the percentage breakdown of a multi-entity device
- 🔮 **Monthly & yearly estimate** based on the selected period
- ⏱️ **Runtime & number of starts** per device, **current power** (live)
- 💱 **Average effective price** per kWh (dual / spot tariffs)
- 🌍 **Currency auto-detect** from Home Assistant settings (€, $, Kč, zł, …) and locale-aware number formatting
- 📏 **Compact mode** – a single 56 px row, perfect for stacking 10 devices in one column (tap cycles through periods)
- 🔴 **Live updates** – the result grows while the device runs, no refresh needed
- ℹ️ Warns when the recorder does not hold enough history for the selected period
- 🗣️ English, Slovak and Czech translations
- 🧱 Zero dependencies – a single JavaScript file, works in both Masonry and Sections dashboards

## 📦 Installation

### HACS (recommended)

1. Open **HACS** in Home Assistant
2. Click the menu (⋮) in the top right corner → **Custom repositories**
3. Add URL `https://github.com/jozefnad/homeassistant-easy_energy_card`, category **Dashboard**
4. Search for **Easy Energy Card** and install it
5. Refresh the browser (Ctrl + F5)

### Manual

1. Copy `easy-energy-card.js` to `/config/www/easy-energy-card.js`
2. **Settings → Dashboards → ⋮ → Resources → Add resource**
   - URL: `/local/easy-energy-card.js`
   - Type: **JavaScript module**
3. Refresh the browser

## 🚀 Quick start

Edit a dashboard → **Add card** → search for **Easy Energy Card**. Pick a device, enter its wattage and the price – done.

Minimal YAML:

```yaml
type: custom:easy-energy-card
entities:
  - entity: switch.coffee_machine
    power: 1200
price: 0.20
```

## ⚙️ Configuration

### Card options

| Option | Type | Default | Description |
|---|---|---|---|
| `entities` | list | **required** | Devices (entity id strings or objects, see below) |
| `title` | string | device name | Card title |
| `icon` | string | device icon | Card icon |
| `compact` | boolean | `false` | Single-row mini card |
| `default_period` | string | `today` | `today`, `yesterday`, `week`, `month`, `this_month` |
| `periods` | list | `[today, yesterday, week, month, custom]` | Which period buttons are shown |
| `show_power` | boolean | `true` | Current total power |
| `show_energy` | boolean | `true` | Energy in kWh |
| `show_projection` | boolean | `true` | Monthly / yearly estimate |
| `show_chart` | boolean | `true` | Timeline / donut chart |
| `show_entities` | boolean | `true` | Per-device list |
| `chart_metric` | string | `cost` | `cost` or `energy` |
| `currency` | string | HA currency | ISO code override, e.g. `CZK` |
| `decimals` | number | auto | Fixed number of decimals for costs |

### Device options (`entities`)

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | **required** | Any entity – `switch`, `light`, `fan`, `media_player`, `climate`, `sensor`… |
| `name` | string | friendly name | Display name |
| `mode` | string | auto | `fixed`, `dimmable`, `multi_speed`, `power_sensor` |
| `power` | number | `0` | Power in W while on (max. power for dimmable / multi-speed) |
| `standby_power` | number | `0` | Power in W while off |
| `min_power` | number | `0` | Power at the lowest brightness / speed |
| `speeds` | map / string | – | Multi-speed levels, e.g. `{low: 20, medium: 40, high: 70}` or percent points `{0: 5, 50: 30, 100: 80}` (linear interpolation) |
| `attribute` | string | auto | Attribute to read the speed from (default `percentage`, `preset_mode`, `fan_mode`) |
| `on_states` | list / string | auto | States considered "on" (e.g. `[playing, paused]`). By default everything except `off`, `standby`, `idle`, `closed`, `docked`… |
| `color` | string | palette | Color in charts |

`unavailable` / `unknown` states always count as 0 W.

### Pricing options

| Option | Tariff | Description |
|---|---|---|
| `tariff` | – | `fixed`, `dual` or `spot` (auto-detected from the options below when omitted) |
| `price` | fixed | Price per kWh |
| `price_high` / `price_low` | dual | High / low tariff price per kWh |
| `low_tariff_times` | dual | Low tariff windows, e.g. `"22:00-06:00, 13:00-15:00"` (overnight windows supported) |
| `low_tariff_weekends` | dual | Whole weekend in low tariff |
| `low_tariff_entity` | dual | Entity switching the tariff (takes precedence over times) |
| `low_tariff_state` | dual | State of that entity meaning *low tariff* (default `on`) |
| `price_entity` | spot | Sensor / `input_number` with the current price |
| `price_add` | spot | Added to the spot price per kWh (grid fees, supplier margin) |
| `price_multiplier` | spot | Multiplies the result, e.g. `1.23` for VAT |

Spot price formula: `(price_entity × unit conversion + price_add) × price_multiplier`.

## 📚 Examples

### Hot tub (multi-entity device with donut breakdown)

```yaml
type: custom:easy-energy-card
title: Hot tub
icon: mdi:hot-tub
entities:
  - entity: switch.hot_tub_heater
    name: Heater
    power: 3000
  - entity: switch.hot_tub_pump
    name: Filter pump
    power: 450
  - entity: light.hot_tub
    name: Light
    power: 15
    standby_power: 0.5
price: 0.18
```

### TV with standby and custom "on" states

```yaml
type: custom:easy-energy-card
entities:
  - entity: media_player.living_room_tv
    power: 95
    standby_power: 1
    on_states: [on, playing, paused, idle]
price: 0.20
```

### Heat recovery unit with named speeds

```yaml
type: custom:easy-energy-card
entities:
  - entity: fan.recuperation
    mode: multi_speed
    speeds:
      low: 18
      medium: 35
      high: 70
    standby_power: 2
price: 0.20
```

### Smart plug with a power sensor + Nord Pool spot price

```yaml
type: custom:easy-energy-card
title: Washing machine
entities:
  - entity: sensor.washing_machine_plug_power
    standby_power: 0.8
tariff: spot
price_entity: sensor.nordpool_kwh_sk_eur_3_10_023
price_add: 0.065
price_multiplier: 1.23
```

### Dual tariff (e.g. Slovak D2 / Czech D25d)

```yaml
type: custom:easy-energy-card
entities:
  - entity: switch.boiler
    power: 2000
tariff: dual
price_high: 0.21
price_low: 0.14
low_tariff_times: "00:00-06:00, 13:00-15:00"
# or let the ripple control (HDO) signal decide:
# low_tariff_entity: binary_sensor.hdo_low_tariff
```

### Compact rows

```yaml
type: vertical-stack
cards:
  - type: custom:easy-energy-card
    compact: true
    entities: [{ entity: switch.dishwasher, power: 1800 }]
    price: 0.2
  - type: custom:easy-energy-card
    compact: true
    entities: [{ entity: light.kitchen, power: 24 }]
    price: 0.2
```

## 🧮 How it works

1. The card loads the state history of your devices (and of the price / tariff entity) for the selected period via the `history/history_during_period` WebSocket API.
2. Every state change creates a time segment with a power value computed by the selected mode (fixed, brightness, speed or measured W).
3. Segments are split at every price change and chart bucket boundary, so each piece of consumption is multiplied by the price valid at that exact time.
4. While a "live" period is displayed, new state changes are appended in real time – no polling of the database.

Everything runs in your browser; nothing is stored and nothing is sent anywhere outside your Home Assistant.

## ⚠️ Limitations & tips

- **History length** – Home Assistant keeps only **10 days** of history by default. For 30-day and monthly views increase it:
  ```yaml
  recorder:
    purge_keep_days: 35
  ```
  The card shows a note when the available history starts later than the selected period.
- Entities **excluded from the recorder** cannot be calculated.
- For spot pricing the **price entity must be recorded** too – its history is used to match past prices.
- Results are **estimates** based on nominal power. For billing-grade values use a real energy meter.
- Very long periods with many frequently-changing entities (e.g. dimmable lights over 30 days) may take a moment to load; results are cached per period.

## 🆚 Comparison

| | Easy Energy Card | Powercalc | Template + Utility meter |
|---|---|---|---|
| Creates entities | ❌ No | ✅ Yes | ✅ Yes |
| Works retroactively (existing history) | ✅ | ❌ | ❌ |
| Setup | Card only | Integration + config | YAML + helpers |
| Spot price matching | ✅ | via extra helpers | via templates |
| Energy dashboard / long-term statistics | ❌ | ✅ | ✅ |

Use Powercalc if you need the values in the Energy dashboard or in automations. Use Easy Energy Card if you just want to *see* what a device costs – instantly and without cluttering your installation.

## 📝 License

MIT
