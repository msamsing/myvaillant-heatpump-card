const CARD_VERSION = "0.3.0";
const CARD_TAG = "myvaillant-heatpump-card";
const EDITOR_TAG = "myvaillant-heatpump-card-editor";

const DEFAULT_CONFIG = {
  title: "myVAILLANT",
  subtitle: "Air-to-water heat pump",
  compact: false,
  show_empty: false,
  entities: {},
};

const ENTITY_GROUPS = [
  {
    title: "System",
    description: "Outdoor sensor, pressure and global operating state.",
    fields: [
      { key: "outdoor_temperature", label: "Outdoor temperature" },
      { key: "system_water_pressure", label: "System water pressure" },
      { key: "energy_manager_state", label: "Energy manager state" },
      { key: "firmware_version", label: "Firmware version" },
    ],
  },
  {
    title: "Heating circuit",
    description: "Circuit 0 and Zone 1 heating/cooling values.",
    fields: [
      { key: "circuit_state", label: "Circuit state" },
      { key: "current_flow_temperature", label: "Current flow temperature" },
      { key: "min_flow_temperature_setpoint", label: "Min flow temperature setpoint" },
      { key: "heating_curve", label: "Heating curve" },
      { key: "heat_demand_limited_by_outside_temperature", label: "Heat demand limited by outside temperature" },
      { key: "zone_current_temperature", label: "Current room temperature" },
      { key: "zone_humidity", label: "Humidity" },
      { key: "zone_desired_temperature", label: "Desired temperature" },
      { key: "zone_desired_heating_temperature", label: "Desired heating temperature" },
      { key: "zone_desired_cooling_temperature", label: "Desired cooling temperature" },
      { key: "zone_heating_operating_mode", label: "Heating operating mode" },
      { key: "zone_special_function", label: "Zone special function" },
      { key: "quick_veto_duration", label: "Quick veto duration" },
      { key: "ventilation_boost", label: "Ventilation boost" },
    ],
  },
  {
    title: "Domestic hot water",
    description: "Tank, setpoint, boost and legionella protection.",
    fields: [
      { key: "dhw_tank_temperature", label: "Tank temperature" },
      { key: "dhw_setpoint", label: "Setpoint" },
      { key: "dhw_operation_mode", label: "Operation mode" },
      { key: "dhw_special_function", label: "Current special function" },
      { key: "dhw_boost", label: "Boost" },
      { key: "legionella_temperature_reached", label: "Legionella temperature reached" },
    ],
  },
  {
    title: "Energy",
    description: "Efficiency, consumed electrical energy and generated heat.",
    fields: [
      { key: "heating_energy_efficiency", label: "Heating energy efficiency" },
      { key: "arotherm_heating_energy_efficiency", label: "aroTHERM heating energy efficiency" },
      { key: "arotherm_consumed_electrical_energy_heating", label: "aroTHERM consumed electrical energy heating" },
      { key: "arotherm_consumed_electrical_energy_dhw", label: "aroTHERM consumed electrical energy DHW" },
      { key: "arotherm_earned_environment_energy_heating", label: "aroTHERM earned environment energy heating" },
      { key: "arotherm_earned_environment_energy_dhw", label: "aroTHERM earned environment energy DHW" },
      { key: "arotherm_heat_generated_heating", label: "aroTHERM heat generated heating" },
      { key: "arotherm_heat_generated_dhw", label: "aroTHERM heat generated DHW" },
      { key: "unitower_heating_energy_efficiency", label: "uniTOWER heating energy efficiency" },
      { key: "unitower_consumed_electrical_energy_heating", label: "uniTOWER consumed electrical energy heating" },
      { key: "unitower_consumed_electrical_energy_dhw", label: "uniTOWER consumed electrical energy DHW" },
      { key: "unitower_heat_generated_heating", label: "uniTOWER heat generated heating" },
      { key: "unitower_heat_generated_dhw", label: "uniTOWER heat generated DHW" },
    ],
  },
  {
    title: "Away and holiday",
    description: "Away mode, dates and remaining holiday duration.",
    fields: [
      { key: "away_mode", label: "Away mode" },
      { key: "away_mode_start_date", label: "Away mode start date" },
      { key: "away_mode_end_date", label: "Away mode end date" },
      { key: "holiday_duration_remaining", label: "Holiday duration remaining" },
    ],
  },
];

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });

class MyVaillantHeatPumpCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      entities: {
        ...DEFAULT_CONFIG.entities,
        ...(config?.entities || {}),
      },
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return this.config?.compact ? 5 : 8;
  }

  getGridOptions() {
    if (this.config?.compact) {
      return {
        columns: 6,
        min_columns: 3,
        max_columns: 12,
      };
    }

    return {
      columns: 12,
      min_columns: 4,
      max_columns: 12,
    };
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig() {
    return {
      title: "myVAILLANT",
      subtitle: "aroTHERM plus + uniTOWER",
      entities: {},
    };
  }

  getEntityId(key) {
    const value = this.config?.entities?.[key];
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object") {
      return value.entity;
    }
    return undefined;
  }

  stateObj(key) {
    const entityId = this.getEntityId(key);
    return entityId ? this._hass?.states?.[entityId] : undefined;
  }

  hasEntity(key) {
    return Boolean(this.getEntityId(key));
  }

  rawState(key) {
    const state = this.stateObj(key)?.state;
    if (state === undefined || state === null) {
      return "";
    }
    return String(state);
  }

  isMissing(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return !normalized || ["unknown", "unavailable", "none", "null"].includes(normalized);
  }

  formatState(key, options = {}) {
    const stateObj = this.stateObj(key);
    if (!stateObj || this.isMissing(stateObj.state)) {
      return "—";
    }
    const unit = options.unit ?? stateObj.attributes?.unit_of_measurement ?? "";
    if (options.hideUnit || !unit) {
      return this.escape(stateObj.state);
    }
    return `${this.escape(stateObj.state)} ${this.escape(unit)}`;
  }

  numberValue(key) {
    const value = this.rawState(key).replace(",", ".");
    const match = value.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  isActive(key) {
    const value = this.rawState(key).trim().toLowerCase();
    if (!value || this.isMissing(value)) {
      return false;
    }
    const inactive = ["off", "false", "inactive", "disabled", "standby", "idle", "normal", "fra", "nej"];
    if (inactive.some((word) => value === word || value.includes(word))) {
      return false;
    }
    const active = ["on", "true", "active", "enabled", "heat", "heating", "dhw", "domestic", "boost", "varme", "varmt"];
    return active.some((word) => value === word || value.includes(word));
  }

  isRunning() {
    const keys = [
      "energy_manager_state",
      "circuit_state",
      "dhw_operation_mode",
      "dhw_special_function",
      "zone_special_function",
    ];

    return keys.some((key) => {
      const value = this.rawState(key).toLowerCase();
      if (!value || /(standby|idle|off|inactive|disabled|fra)/.test(value)) {
        return false;
      }
      return /(heat|heating|dhw|domestic|hot water|active|running|compressor|varme|varmt)/.test(value);
    });
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  percentFromRange(key, min, max, fallback) {
    const value = this.numberValue(key);
    if (value === null) {
      return fallback;
    }
    return this.clamp(((value - min) / (max - min)) * 100, 5, 100);
  }

  boolLabel(key) {
    if (!this.hasEntity(key)) {
      return "—";
    }
    return this.isActive(key) ? "Active" : "Off";
  }

  row(label, key, icon) {
    if (!this.config.show_empty && !this.hasEntity(key)) {
      return "";
    }
    const entityId = this.getEntityId(key) || "";
    const value = this.formatState(key);
    return `
      <div class="row" title="${this.escape(entityId)}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${this.escape(label)}</span>
        <b>${value}</b>
      </div>
    `;
  }

  boolRow(label, key, icon) {
    if (!this.config.show_empty && !this.hasEntity(key)) {
      return "";
    }
    const active = this.isActive(key);
    const value = this.boolLabel(key);
    return `
      <div class="row ${active ? "active" : ""}" title="${this.escape(this.getEntityId(key) || "")}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${this.escape(label)}</span>
        <b>${this.escape(value)}</b>
      </div>
    `;
  }

  panel(title, icon, rows) {
    const body = rows.filter(Boolean).join("");
    if (!body && !this.config.show_empty) {
      return "";
    }
    return `
      <section class="panel">
        <header><ha-icon icon="${icon}"></ha-icon><span>${this.escape(title)}</span></header>
        ${body || '<div class="empty">No entities configured yet</div>'}
      </section>
    `;
  }

  pill(label, key, icon, tone = "") {
    if (!this.config.show_empty && !this.hasEntity(key)) {
      return "";
    }
    const active = this.isActive(key);
    return `
      <div class="pill ${tone} ${active ? "active" : ""}" title="${this.escape(this.getEntityId(key) || "")}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${this.escape(label)}</span>
        <b>${this.formatState(key)}</b>
      </div>
    `;
  }

  escape(value) {
    return escapeHtml(value);
  }

  summaryTile(label, key, icon, options = {}) {
    const { active = false, tone = "", value } = options;
    if (!this.config.show_empty && key && !this.hasEntity(key)) {
      return "";
    }

    return `
      <div class="summary-tile ${tone} ${active ? "active" : ""}" title="${this.escape(key ? this.getEntityId(key) || "" : "")}">
        <ha-icon icon="${icon}"></ha-icon>
        <span>${this.escape(label)}</span>
        <b>${value ?? this.formatState(key)}</b>
      </div>
    `;
  }

  render() {
    if (!this.config || !this._hass) {
      return;
    }

    const running = this.isRunning();
    const flowPercent = this.percentFromRange("current_flow_temperature", 15, 60, 42);
    const tankPercent = this.percentFromRange("dhw_tank_temperature", 20, 65, 56);
    const pressure = this.numberValue("system_water_pressure");
    const pressureClass = pressure !== null && (pressure < 1 || pressure > 2.6) ? "warn" : "";
    const status = this.hasEntity("energy_manager_state")
      ? this.formatState("energy_manager_state")
      : this.formatState("circuit_state");
    const compact = Boolean(this.config.compact);

    const summaryTiles = [
      this.summaryTile("Operation", null, running ? "mdi:play-circle" : "mdi:pause-circle", {
        active: running,
        value: status,
      }),
      this.summaryTile("Outdoor", "outdoor_temperature", "mdi:thermometer"),
      this.summaryTile("Flow", "current_flow_temperature", "mdi:thermometer-water", { tone: "hot" }),
      this.summaryTile("Room", "zone_current_temperature", "mdi:home-thermometer"),
      this.summaryTile("DHW", "dhw_tank_temperature", "mdi:water-boiler", { tone: "hot" }),
      this.summaryTile("Pressure", "system_water_pressure", "mdi:gauge", { tone: pressureClass }),
      this.summaryTile("DHW boost", "dhw_boost", "mdi:rocket-launch", {
        active: this.isActive("dhw_boost"),
        tone: "hot",
        value: this.boolLabel("dhw_boost"),
      }),
      this.summaryTile("Away", "away_mode", "mdi:home-export-outline", {
        active: this.isActive("away_mode"),
        value: this.boolLabel("away_mode"),
      }),
    ].join("");

    const panels = [
      this.panel("Operation", "mdi:heat-pump", [
        this.row("Energy manager", "energy_manager_state", "mdi:state-machine"),
        this.row("Circuit state", "circuit_state", "mdi:pipe-valve"),
        this.row("Firmware", "firmware_version", "mdi:chip"),
        this.boolRow("Outdoor temperature limit", "heat_demand_limited_by_outside_temperature", "mdi:thermometer-alert"),
      ]),
      this.panel("Heating circuit", "mdi:radiator", [
        this.row("Flow temperature", "current_flow_temperature", "mdi:thermometer-water"),
        this.row("Min flow setpoint", "min_flow_temperature_setpoint", "mdi:thermometer-chevron-up"),
        this.row("Heating curve", "heating_curve", "mdi:chart-bell-curve"),
        this.row("Desired temperature", "zone_desired_temperature", "mdi:home-thermometer"),
        this.row("Desired heating", "zone_desired_heating_temperature", "mdi:fire"),
        this.row("Desired cooling", "zone_desired_cooling_temperature", "mdi:snowflake-thermometer"),
        this.row("Room temperature", "zone_current_temperature", "mdi:home-thermometer-outline"),
        this.row("Humidity", "zone_humidity", "mdi:water-percent"),
        this.row("Operating mode", "zone_heating_operating_mode", "mdi:tune-variant"),
        this.row("Special function", "zone_special_function", "mdi:star-cog"),
        this.row("Quick veto", "quick_veto_duration", "mdi:timer-outline"),
        this.boolRow("Ventilation boost", "ventilation_boost", "mdi:fan-plus"),
      ]),
      this.panel("Domestic hot water", "mdi:water-boiler", [
        this.row("Tank temperature", "dhw_tank_temperature", "mdi:thermometer"),
        this.row("Setpoint", "dhw_setpoint", "mdi:target"),
        this.row("Operating mode", "dhw_operation_mode", "mdi:cog-outline"),
        this.row("Special function", "dhw_special_function", "mdi:star-cog-outline"),
        this.boolRow("Hot water boost", "dhw_boost", "mdi:rocket-launch"),
        this.boolRow("Legionella temperature reached", "legionella_temperature_reached", "mdi:bacteria-outline"),
      ]),
      this.panel("Energy", "mdi:lightning-bolt", [
        this.row("System efficiency", "heating_energy_efficiency", "mdi:gauge"),
        this.row("aroTHERM efficiency", "arotherm_heating_energy_efficiency", "mdi:gauge-full"),
        this.row("aroTHERM electrical heating", "arotherm_consumed_electrical_energy_heating", "mdi:transmission-tower-import"),
        this.row("aroTHERM electrical DHW", "arotherm_consumed_electrical_energy_dhw", "mdi:transmission-tower-import"),
        this.row("Environment energy heating", "arotherm_earned_environment_energy_heating", "mdi:leaf"),
        this.row("Environment energy DHW", "arotherm_earned_environment_energy_dhw", "mdi:leaf-circle"),
        this.row("aroTHERM heat generated", "arotherm_heat_generated_heating", "mdi:heat-wave"),
        this.row("aroTHERM DHW generated", "arotherm_heat_generated_dhw", "mdi:water-thermometer"),
        this.row("uniTOWER efficiency", "unitower_heating_energy_efficiency", "mdi:gauge"),
        this.row("uniTOWER electrical heating", "unitower_consumed_electrical_energy_heating", "mdi:flash"),
        this.row("uniTOWER electrical DHW", "unitower_consumed_electrical_energy_dhw", "mdi:flash-outline"),
        this.row("uniTOWER heat generated", "unitower_heat_generated_heating", "mdi:radiator"),
        this.row("uniTOWER DHW generated", "unitower_heat_generated_dhw", "mdi:water-boiler"),
      ]),
      this.panel("Away and holiday", "mdi:bag-suitcase", [
        this.boolRow("Away mode", "away_mode", "mdi:home-export-outline"),
        this.row("Away start", "away_mode_start_date", "mdi:calendar-start"),
        this.row("Away end", "away_mode_end_date", "mdi:calendar-end"),
        this.row("Holiday remaining", "holiday_duration_remaining", "mdi:calendar-clock"),
      ]),
    ].join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 100%;
          min-width: 0;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        ha-card {
          container-type: inline-size;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
          border-radius: var(--ha-card-border-radius, 20px);
          background:
            radial-gradient(circle at 12% 18%, rgba(36, 166, 212, 0.24), transparent 32%),
            radial-gradient(circle at 88% 12%, rgba(244, 172, 64, 0.2), transparent 28%),
            linear-gradient(135deg, #101820 0%, #172026 46%, #1d2b2e 100%);
          color: #f7fbff;
          box-shadow: var(--ha-card-box-shadow, 0 16px 45px rgba(0, 0, 0, 0.28));
        }

        .card {
          padding: 22px;
          max-width: 100%;
          min-width: 0;
        }

        .top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: start;
          margin-bottom: 18px;
        }

        .eyebrow {
          color: #8bd7ef;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .title {
          margin-top: 2px;
          color: #ffffff;
          font-size: 28px;
          font-weight: 850;
          line-height: 1.05;
          overflow-wrap: anywhere;
        }

        .subtitle {
          margin-top: 6px;
          color: rgba(247, 251, 255, 0.72);
          font-size: 14px;
        }

        .runtime {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          min-width: 172px;
          max-width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
        }

        .runtime ha-icon {
          width: 28px;
          height: 28px;
          color: ${running ? "#4ee1a0" : "#9fb0b8"};
          animation: ${running ? "pulse 1.6s ease-in-out infinite" : "none"};
        }

        .runtime span,
        .metric span,
        .pill span {
          display: block;
          color: rgba(247, 251, 255, 0.62);
          font-size: 11px;
          font-weight: 750;
          text-transform: uppercase;
        }

        .runtime b {
          display: block;
          margin-top: 1px;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .scene {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(28px, 0.22fr) minmax(0, 0.95fr) minmax(28px, 0.22fr) minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-height: 240px;
          margin: 4px 0 18px;
          min-width: 0;
        }

        .component {
          position: relative;
          min-width: 0;
          min-height: 212px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .label {
          display: flex;
          gap: 8px;
          align-items: center;
          color: rgba(247, 251, 255, 0.82);
          font-size: 13px;
          font-weight: 800;
        }

        .label ha-icon {
          width: 18px;
          color: #8bd7ef;
        }

        .pump-body {
          position: relative;
          height: 126px;
          margin-top: 18px;
          border-radius: 16px;
          border: 2px solid rgba(139, 215, 239, 0.52);
          background:
            linear-gradient(90deg, rgba(139, 215, 239, 0.16), transparent 52%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05));
        }

        .fan {
          position: absolute;
          left: 18px;
          top: 24px;
          width: clamp(48px, 44%, 78px);
          aspect-ratio: 1;
          border: 4px solid rgba(139, 215, 239, 0.76);
          border-radius: 50%;
          background:
            conic-gradient(from 18deg, transparent 0 14%, rgba(139, 215, 239, 0.85) 14% 28%, transparent 28% 43%, rgba(139, 215, 239, 0.85) 43% 57%, transparent 57% 72%, rgba(139, 215, 239, 0.85) 72% 86%, transparent 86% 100%);
          animation: ${running ? "spin 1.4s linear infinite" : "none"};
        }

        .grille {
          position: absolute;
          right: 18px;
          top: 25px;
          width: clamp(24px, 24%, 42px);
          height: 76px;
          border-radius: 10px;
          background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.24) 0 3px, transparent 3px 8px);
        }

        .tower-body {
          position: relative;
          display: grid;
          grid-template-columns: minmax(38px, 54px) minmax(0, 1fr);
          gap: 13px;
          height: 136px;
          margin-top: 15px;
          align-items: end;
        }

        .tank {
          position: relative;
          height: 126px;
          border-radius: 22px 22px 16px 16px;
          border: 2px solid rgba(244, 172, 64, 0.6);
          background: rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }

        .tank::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: var(--tank-level);
          background: linear-gradient(180deg, rgba(255, 221, 126, 0.92), rgba(240, 105, 72, 0.82));
        }

        .module {
          display: grid;
          gap: 8px;
        }

        .module div {
          min-height: 26px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.13);
        }

        .house-shape {
          position: relative;
          height: 136px;
          margin-top: 18px;
        }

        .roof {
          width: min(112px, 72%);
          height: 72px;
          margin: 0 auto;
          clip-path: polygon(50% 0, 100% 58%, 86% 58%, 86% 100%, 14% 100%, 14% 58%, 0 58%);
          background: linear-gradient(180deg, rgba(139, 215, 239, 0.95), rgba(78, 225, 160, 0.78));
        }

        .floor-loop {
          width: min(142px, 88%);
          height: 48px;
          margin: 10px auto 0;
          border-radius: 999px;
          border: 4px solid rgba(244, 172, 64, 0.82);
          border-left-color: rgba(139, 215, 239, 0.82);
          border-right-color: rgba(78, 225, 160, 0.82);
        }

        .pipe {
          position: relative;
          height: 12px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.1);
        }

        .pipe::before {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(90deg, #4db7d8 0 18px, #4ee1a0 18px 36px, #f4ac40 36px 54px, #f06948 54px 72px);
          animation: ${running ? "flow 1.35s linear infinite" : "none"};
        }

        .pipe::after {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        .metric {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, auto);
          gap: 6px;
          align-items: baseline;
          margin-top: 13px;
          padding: 9px 10px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.18);
        }

        .metric b {
          justify-self: end;
          font-size: 18px;
          font-weight: 850;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .metric.warn b {
          color: #ffcf66;
        }

        .flow-bar {
          position: relative;
          height: 8px;
          margin-top: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.14);
          overflow: hidden;
        }

        .flow-bar::after {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: var(--flow-level);
          border-radius: inherit;
          background: linear-gradient(90deg, #4db7d8, #4ee1a0, #f4ac40, #f06948);
        }

        .quick {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .pill {
          min-width: 0;
          padding: 10px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
        }

        .pill ha-icon {
          float: right;
          width: 20px;
          color: rgba(255, 255, 255, 0.55);
        }

        .pill.active {
          border-color: rgba(78, 225, 160, 0.46);
          background: rgba(78, 225, 160, 0.13);
        }

        .pill.hot.active {
          border-color: rgba(240, 105, 72, 0.5);
          background: rgba(240, 105, 72, 0.16);
        }

        .pill.warn b {
          color: #ffcf66;
        }

        .pill b {
          display: block;
          margin-top: 5px;
          color: #fff;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .panel-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .panel {
          min-width: 0;
          padding: 13px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.11);
          background: rgba(255, 255, 255, 0.075);
        }

        .panel header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #fff;
          font-weight: 850;
        }

        .panel header ha-icon {
          width: 19px;
          color: #f4ac40;
        }

        .row {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr) minmax(52px, 42%);
          gap: 8px;
          align-items: center;
          min-height: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(247, 251, 255, 0.75);
        }

        .row:first-of-type {
          border-top: 0;
        }

        .row ha-icon {
          width: 18px;
          color: rgba(139, 215, 239, 0.9);
        }

        .row span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .row b {
          color: #ffffff;
          font-size: 13px;
          font-weight: 780;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .row.active b {
          color: #4ee1a0;
        }

        .empty {
          color: rgba(247, 251, 255, 0.6);
          font-size: 13px;
        }

        .compact-summary {
          display: none;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 4px 0 10px;
        }

        .summary-tile {
          display: grid;
          grid-template-columns: 20px minmax(0, 1fr);
          grid-template-areas:
            "icon label"
            "icon value";
          column-gap: 7px;
          align-items: center;
          min-width: 0;
          min-height: 48px;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.07);
        }

        .summary-tile ha-icon {
          grid-area: icon;
          width: 18px;
          color: rgba(139, 215, 239, 0.92);
        }

        .summary-tile span {
          grid-area: label;
          color: rgba(247, 251, 255, 0.62);
          font-size: 10px;
          font-weight: 780;
          text-transform: uppercase;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-tile b {
          grid-area: value;
          color: #fff;
          font-size: 13px;
          font-weight: 820;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-tile.active b {
          color: #4ee1a0;
        }

        .summary-tile.hot ha-icon {
          color: #f4ac40;
        }

        .summary-tile.warn b {
          color: #ffcf66;
        }

        .card.compact {
          padding: 12px;
        }

        .card.compact .top {
          gap: 10px;
          margin-bottom: 10px;
        }

        .card.compact .eyebrow,
        .card.compact .subtitle,
        .card.compact .scene,
        .card.compact .quick,
        .card.compact .runtime {
          display: none;
        }

        .card.compact .title {
          font-size: 20px;
          line-height: 1.15;
        }

        .card.compact .compact-summary {
          display: grid;
        }

        .card.compact .panel-grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .card.compact .panel {
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.055);
        }

        .card.compact .panel header {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .card.compact .row {
          min-height: 26px;
          grid-template-columns: 18px minmax(0, 1fr) minmax(48px, 38%);
          gap: 6px;
        }

        .card.compact .row ha-icon {
          width: 16px;
        }

        .card.compact .row span,
        .card.compact .row b {
          font-size: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes flow {
          to { background-position: 72px 0; }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        @container (min-width: 980px) {
          .panel-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @container (max-width: 860px) {
          .scene {
            grid-template-columns: 1fr;
            min-height: 0;
          }

          .pipe {
            width: 12px;
            height: 46px;
            justify-self: center;
          }

          .pipe::before {
            background: repeating-linear-gradient(180deg, #4db7d8 0 18px, #4ee1a0 18px 36px, #f4ac40 36px 54px, #f06948 54px 72px);
          }

          .panel-grid {
            grid-template-columns: 1fr;
          }
        }

        @container (max-width: 620px) {
          .card {
            padding: 16px;
          }

          .top {
            grid-template-columns: 1fr;
          }

          .quick {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .runtime {
            min-width: 0;
          }

          .component {
            min-height: 190px;
          }

          .title {
            font-size: 24px;
          }
        }

        @container (max-width: 540px) {
          .card {
            padding: 12px;
          }

          .scene {
            display: none;
          }

          .quick {
            display: none;
          }

          .compact-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .panel-grid {
            gap: 8px;
          }

          .panel {
            padding: 9px 10px;
            border-radius: 10px;
          }

          .panel header {
            margin-bottom: 4px;
            font-size: 13px;
          }

          .row {
            min-height: 28px;
            grid-template-columns: 18px minmax(0, 1fr) minmax(48px, 38%);
            gap: 6px;
          }

          .row ha-icon {
            width: 16px;
          }

          .row span,
          .row b {
            font-size: 12px;
          }
        }

        @container (max-width: 420px) {
          .quick {
            grid-template-columns: 1fr;
          }

          .compact-summary {
            grid-template-columns: 1fr;
          }

          .row {
            grid-template-columns: 22px minmax(0, 1fr);
            padding: 6px 0;
          }

          .row b {
            grid-column: 2;
            justify-self: start;
            max-width: 100%;
            text-align: left;
          }
        }

        @media (max-width: 760px) {
          .card {
            padding: 16px;
          }

          .top,
          .panel-grid {
            grid-template-columns: 1fr;
          }

          .quick {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .runtime {
            min-width: 0;
          }

          .scene {
            grid-template-columns: 1fr;
            min-height: 0;
          }

          .component {
            min-height: 190px;
          }

          .pipe {
            width: 12px;
            height: 46px;
            justify-self: center;
          }

          .pipe::before {
            background: repeating-linear-gradient(180deg, #4db7d8 0 18px, #4ee1a0 18px 36px, #f4ac40 36px 54px, #f06948 54px 72px);
          }

          .title {
            font-size: 24px;
          }
        }

        @media (max-width: 540px) {
          .card {
            padding: 12px;
          }

          .scene,
          .quick {
            display: none;
          }

          .compact-summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .panel-grid {
            gap: 8px;
          }

          .panel {
            padding: 9px 10px;
            border-radius: 10px;
          }

          .panel header {
            margin-bottom: 4px;
            font-size: 13px;
          }

          .row {
            min-height: 28px;
            grid-template-columns: 18px minmax(0, 1fr) minmax(48px, 38%);
            gap: 6px;
          }

          .row ha-icon {
            width: 16px;
          }

          .row span,
          .row b {
            font-size: 12px;
          }
        }

        @media (max-width: 420px) {
          .quick {
            grid-template-columns: 1fr;
          }

          .compact-summary {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <ha-card>
        <div class="card ${running ? "running" : "idle"} ${compact ? "compact" : ""}">
          <div class="top">
            <div>
              <div class="eyebrow">myVAILLANT heat pump</div>
              <div class="title">${this.escape(this.config.title)}</div>
              <div class="subtitle">${this.escape(this.config.subtitle)} · v${CARD_VERSION}</div>
            </div>
            <div class="runtime">
              <ha-icon icon="${running ? "mdi:play-circle" : "mdi:pause-circle"}"></ha-icon>
              <div>
                <span>Operation</span>
                <b>${status}</b>
              </div>
            </div>
          </div>

          <div class="compact-summary">
            ${summaryTiles}
          </div>

          <div class="scene">
            <section class="component">
              <div class="label"><ha-icon icon="mdi:fan"></ha-icon><span>aroTHERM plus</span></div>
              <div class="pump-body">
                <div class="fan"></div>
                <div class="grille"></div>
              </div>
              <div class="metric">
                <span>Outdoor</span>
                <b>${this.formatState("outdoor_temperature")}</b>
              </div>
            </section>

            <div class="pipe" aria-label="Energy flow from outdoor unit to indoor unit"></div>

            <section class="component" style="--tank-level: ${tankPercent}%">
              <div class="label"><ha-icon icon="mdi:water-boiler"></ha-icon><span>uniTOWER / tank</span></div>
              <div class="tower-body">
                <div class="tank"></div>
                <div class="module">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
              <div class="metric">
                <span>Hot water</span>
                <b>${this.formatState("dhw_tank_temperature")}</b>
              </div>
            </section>

            <div class="pipe" aria-label="Heat flow to the house"></div>

            <section class="component" style="--flow-level: ${flowPercent}%">
              <div class="label"><ha-icon icon="mdi:home-thermometer"></ha-icon><span>Zone 1 / heating circuit</span></div>
              <div class="house-shape">
                <div class="roof"></div>
                <div class="floor-loop"></div>
              </div>
              <div class="metric">
                <span>Room</span>
                <b>${this.formatState("zone_current_temperature")}</b>
              </div>
              <div class="flow-bar"></div>
            </section>
          </div>

          <div class="quick">
            ${this.pill("Flow temp", "current_flow_temperature", "mdi:thermometer-water", "hot")}
            <div class="pill ${pressureClass}">
              <ha-icon icon="mdi:gauge"></ha-icon>
              <span>Water pressure</span>
              <b>${this.formatState("system_water_pressure")}</b>
            </div>
            ${this.pill("DHW boost", "dhw_boost", "mdi:rocket-launch", "hot")}
            ${this.pill("Away mode", "away_mode", "mdi:home-export-outline")}
          </div>

          <div class="panel-grid">
            ${panels}
          </div>
        </div>
      </ha-card>
    `;
  }
}

class MyVaillantHeatPumpCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    this.syncPickers();
  }

  setConfig(config) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      entities: {
        ...(config?.entities || {}),
      },
    };
    this.render();
  }

  getEntityId(key) {
    const value = this._config?.entities?.[key];
    if (typeof value === "string") {
      return value;
    }
    if (value && typeof value === "object") {
      return value.entity;
    }
    return "";
  }

  configChanged(config) {
    this._config = config;
    const event = new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      detail: { config },
    });
    this.dispatchEvent(event);
  }

  updateConfigValue(key, value) {
    this.configChanged({
      ...this._config,
      [key]: value,
    });
  }

  updateEntity(key, value) {
    const entities = {
      ...(this._config?.entities || {}),
    };

    if (value) {
      entities[key] = value;
    } else {
      delete entities[key];
    }

    this.configChanged({
      ...this._config,
      entities,
    });
  }

  syncPickers() {
    if (!this.shadowRoot || !this._hass) {
      return;
    }

    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => {
      const key = picker.dataset.key;
      const field = ENTITY_GROUPS.flatMap((group) => group.fields).find((item) => item.key === key);
      picker.hass = this._hass;
      picker.value = this.getEntityId(key);
      picker.label = field?.label || key;
      picker.allowCustomEntity = true;
      picker.placeholder = "Type or select an entity";
    });
  }

  bindControls() {
    this.shadowRoot.querySelectorAll("ha-textfield").forEach((field) => {
      const key = field.dataset.configKey;
      field.value = this._config?.[key] ?? "";
      field.addEventListener("change", (event) => {
        this.updateConfigValue(key, event.target.value);
      });
    });

    const showEmpty = this.shadowRoot.getElementById("show-empty");
    if (showEmpty) {
      showEmpty.checked = Boolean(this._config?.show_empty);
      showEmpty.addEventListener("change", (event) => {
        this.updateConfigValue("show_empty", Boolean(event.target.checked));
      });
    }

    const compact = this.shadowRoot.getElementById("compact");
    if (compact) {
      compact.checked = Boolean(this._config?.compact);
      compact.addEventListener("change", (event) => {
        this.updateConfigValue("compact", Boolean(event.target.checked));
      });
    }

    this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((picker) => {
      picker.addEventListener("value-changed", (event) => {
        this.updateEntity(picker.dataset.key, event.detail?.value || "");
      });
      picker.addEventListener("change", (event) => {
        if (event.target?.value !== undefined) {
          this.updateEntity(picker.dataset.key, event.target.value || "");
        }
      });
    });

    this.syncPickers();
  }

  render() {
    if (!this._config) {
      return;
    }

    const groups = ENTITY_GROUPS.map(
      (group, index) => `
        <details ${index < 2 ? "open" : ""}>
          <summary>
            <div>
              <span>${escapeHtml(group.title)}</span>
              <small>${escapeHtml(group.description)}</small>
            </div>
          </summary>
          <div class="fields">
            ${group.fields
              .map(
                (field) => `
                  <ha-entity-picker
                    data-key="${escapeHtml(field.key)}"
                    label="${escapeHtml(field.label)}"
                    placeholder="Type or select an entity"
                    allow-custom-entity
                  ></ha-entity-picker>
                `
              )
              .join("")}
          </div>
        </details>
      `
    ).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color);
        }

        .editor {
          display: grid;
          gap: 16px;
        }

        .intro {
          display: grid;
          gap: 12px;
        }

        ha-textfield,
        ha-entity-picker {
          display: block;
          width: 100%;
        }

        .switch-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          padding: 12px 0;
        }

        .switch-row span {
          font-weight: 500;
        }

        .switch-row small,
        summary small {
          display: block;
          margin-top: 2px;
          color: var(--secondary-text-color);
          font-size: 12px;
          line-height: 1.35;
        }

        details {
          border: 1px solid var(--divider-color);
          border-radius: 12px;
          overflow: hidden;
          background: var(--card-background-color);
        }

        summary {
          cursor: pointer;
          padding: 14px 16px;
          font-weight: 600;
        }

        .fields {
          display: grid;
          gap: 12px;
          padding: 0 16px 16px;
        }
      </style>

      <div class="editor">
        <div class="intro">
          <ha-textfield data-config-key="title" label="Title"></ha-textfield>
          <ha-textfield data-config-key="subtitle" label="Subtitle"></ha-textfield>
          <label class="switch-row">
            <span>
              Compact layout
              <small>Use a dense section-friendly view with summary tiles instead of the large infographic.</small>
            </span>
            <ha-switch id="compact"></ha-switch>
          </label>
          <label class="switch-row">
            <span>
              Show empty fields
              <small>Keep configured-but-empty rows visible instead of hiding them.</small>
            </span>
            <ha-switch id="show-empty"></ha-switch>
          </label>
        </div>
        ${groups}
      </div>
    `;

    this.bindControls();
  }
}

if (!customElements.get(CARD_TAG)) {
  customElements.define(CARD_TAG, MyVaillantHeatPumpCard);
}

if (!customElements.get(EDITOR_TAG)) {
  customElements.define(EDITOR_TAG, MyVaillantHeatPumpCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TAG)) {
  window.customCards.push({
    type: CARD_TAG,
    name: "MyVaillant Heat Pump Card",
    description: "Infographic Lovelace card for Vaillant aroTHERM plus / uniTOWER systems",
    documentationURL: "https://github.com/msamsing/myvaillant-heatpump-card",
  });
}

console.info(
  `%c MYVAILLANT-HEATPUMP-CARD %c ${CARD_VERSION} `,
  "color: white; background: #1d2b2e; font-weight: 700;",
  "color: #1d2b2e; background: #8bd7ef; font-weight: 700;"
);
