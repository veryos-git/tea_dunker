// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import { o_state, f_send_wsmsg_with_response, o_wsmsg__syncdata } from './index.js';

import {
    f_o_html_from_o_js,
} from "./lib/handyhelpers.js"

import {
    f_o_wsmsg,
    f_o_logmsg,
    o_wsmsg__esp32_compile_flash,
    o_wsmsg__esp32_serial_monitor,
    o_wsmsg__esp32_command,
    o_wsmsg__esp32_detect_port,
    o_wsmsg__esp32_preview_code,
    o_wsmsg__logmsg,
    s_name_prop_id,
} from './constructors.js';

// intercept server logmsg to route CLI output into the log panel instead of toasts
let f_original_logmsg_impl = o_wsmsg__logmsg.f_v_client_implementation;
o_wsmsg__logmsg.f_v_client_implementation = function(o_wsmsg, o_wsmsg__existing, o_state_ref){
    let o_logmsg = o_wsmsg.v_data;
    // route CLI-tagged messages ([CMD], [flash], [serial]) to the log panel
    if(o_logmsg && o_logmsg.s_message && (
        o_logmsg.s_message.startsWith('[CMD]') ||
        o_logmsg.s_message.startsWith('[flash]') ||
        o_logmsg.s_message.startsWith('[serial]')
    )){
        if(!o_state_ref.a_o_logmsg__cli) o_state_ref.a_o_logmsg__cli = [];
        o_state_ref.a_o_logmsg__cli.push(o_logmsg);
        // keep max 500 entries
        if(o_state_ref.a_o_logmsg__cli.length > 500){
            o_state_ref.a_o_logmsg__cli.splice(0, o_state_ref.a_o_logmsg__cli.length - 500);
        }
        // still log to console
        if(o_logmsg.b_consolelog){
            console[o_logmsg.s_type](o_logmsg.s_message);
        }
        return;
    }
    // non-CLI messages: use original toast behavior
    if(f_original_logmsg_impl){
        return f_original_logmsg_impl(o_wsmsg, o_wsmsg__existing, o_state_ref);
    }
};

let o_component__esp32 = {
    name: 'component-esp32',
    template: (await f_o_html_from_o_js({
        class: "esp32_page",
        a_o: [
            // ── 3-column layout ──
            {
                class: "esp32_columns",
                a_o: [
                    // ── LEFT: Config ──
                    {
                        class: "esp32_col esp32_col__config",
                        a_o: [
                            { s_tag: "h2", innerText: "Config" },
                            // WiFi
                            {
                                class: "esp32_section",
                                a_o: [
                                    { s_tag: "h3", innerText: "WiFi" },
                                    {
                                        class: "esp32_field_row",
                                        a_o: [
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "SSID" },
                                                    { s_tag: "input", type: "text", ':value': "f_s_kv('s_wifi_ssid')", '@change': "f_update_kv('s_wifi_ssid', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Password" },
                                                    { s_tag: "input", type: "password", ':value': "f_s_kv('s_wifi_password')", '@change': "f_update_kv('s_wifi_password', $event.target.value)" },
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                            // Server
                            {
                                class: "esp32_section",
                                a_o: [
                                    { s_tag: "h3", innerText: "Server WS" },
                                    {
                                        class: "esp32_field_row",
                                        a_o: [
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "IP" },
                                                    { s_tag: "input", type: "text", ':value': "f_s_kv('s_ip__server_websocket')", '@change': "f_update_kv('s_ip__server_websocket', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Port" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_port__server_websocket')", '@change': "f_update_kv('n_port__server_websocket', $event.target.value)" },
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                            // Pins
                            {
                                class: "esp32_section",
                                a_o: [
                                    { s_tag: "h3", innerText: "Pins (ULN2003)" },
                                    {
                                        class: "esp32_field_row",
                                        a_o: [
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "IN1" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_pin_in1')", '@change': "f_update_kv('n_pin_in1', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "IN2" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_pin_in2')", '@change': "f_update_kv('n_pin_in2', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "IN3" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_pin_in3')", '@change': "f_update_kv('n_pin_in3', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "IN4" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_pin_in4')", '@change': "f_update_kv('n_pin_in4', $event.target.value)" },
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                            // Stepper procedure
                            {
                                class: "esp32_section",
                                a_o: [
                                    { s_tag: "h3", innerText: "Stepper" },
                                    {
                                        class: "esp32_field_row",
                                        a_o: [
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Fwd deg" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_deg_forward')", '@change': "f_update_kv('n_deg_forward', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Bwd deg" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_deg_backward')", '@change': "f_update_kv('n_deg_backward', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Min" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_min_duration')", '@change': "f_update_kv('n_min_duration', $event.target.value)" },
                                                ]
                                            },
                                        ]
                                    },
                                    {
                                        class: "esp32_field_row",
                                        a_o: [
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "RPM (0.1-15)" },
                                                    { s_tag: "input", type: "number", step: "0.1", min: "0.1", max: "15.0", ':value': "f_s_kv('n_rpm')", '@change': "f_update_kv('n_rpm', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Final deg" },
                                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_deg_final')", '@change': "f_update_kv('n_deg_final', $event.target.value)" },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Final dir" },
                                                    {
                                                        s_tag: "select",
                                                        ':value': "f_s_kv('s_dir_final')",
                                                        '@change': "f_update_kv('s_dir_final', $event.target.value)",
                                                        a_o: [
                                                            { s_tag: "option", value: "forward", innerText: "Forward" },
                                                            { s_tag: "option", value: "backward", innerText: "Backward" },
                                                        ]
                                                    },
                                                ]
                                            },
                                        ]
                                    },
                                ]
                            },
                            // Device + flash
                            {
                                class: "esp32_section",
                                a_o: [
                                    { s_tag: "h3", innerText: "Device" },
                                    {
                                        class: "esp32_field_row",
                                        a_o: [
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "Port" },
                                                    {
                                                        s_tag: "select",
                                                        ':value': "f_s_kv('s_path_port__esp32')",
                                                        '@change': "f_update_kv('s_path_port__esp32', $event.target.value)",
                                                        a_o: [
                                                            {
                                                                s_tag: "option",
                                                                'v-for': "s_port in a_s_port__detected",
                                                                ':value': "s_port",
                                                                innerText: "{{ s_port }}",
                                                            },
                                                            {
                                                                s_tag: "option",
                                                                'v-if': "a_s_port__detected.length === 0",
                                                                ':value': "f_s_kv('s_path_port__esp32')",
                                                                innerText: "{{ f_s_kv('s_path_port__esp32') }}",
                                                            },
                                                        ]
                                                    },
                                                ]
                                            },
                                            {
                                                class: "esp32_field",
                                                a_o: [
                                                    { s_tag: "label", innerText: "FQBN" },
                                                    { s_tag: "input", type: "text", ':value': "f_s_kv('s_fqbn__esp32')", '@change': "f_update_kv('s_fqbn__esp32', $event.target.value)" },
                                                ]
                                            },
                                        ]
                                    },
                                    {
                                        class: "esp32_button_row",
                                        a_o: [
                                            {
                                                s_tag: "button",
                                                class: "interactable",
                                                '@click': "f_detect_port()",
                                                ':disabled': "b_detecting_port",
                                                innerText: "{{ b_detecting_port ? 'Scanning...' : 'Detect' }}",
                                            },
                                            {
                                                s_tag: "button",
                                                class: "interactable esp32_btn_flash",
                                                '@click': "f_compile_flash()",
                                                ':disabled': "b_compiling",
                                                innerText: "{{ b_compiling ? 'Flashing...' : 'Compile & Flash' }}",
                                            },
                                        ]
                                    },
                                    {
                                        s_tag: "div",
                                        'v-if': "s_flash_result",
                                        ':class': "'esp32_result ' + (b_flash_success ? 'success' : 'error')",
                                        innerText: "{{ s_flash_result }}",
                                    },
                                ]
                            },
                        ]
                    },

                    // ── CENTER: Serial Monitor ──
                    {
                        class: "esp32_col esp32_col__serial",
                        a_o: [
                            {
                                class: "esp32_col_header",
                                a_o: [
                                    { s_tag: "h2", innerText: "Serial Monitor" },
                                    {
                                        class: "esp32_button_row",
                                        a_o: [
                                            {
                                                s_tag: "button",
                                                class: "interactable",
                                                '@click': "f_toggle_serial_monitor()",
                                                ':class': "{ active: b_serial_active }",
                                                innerText: "{{ b_serial_active ? 'Stop' : 'Start' }}",
                                            },
                                            {
                                                s_tag: "button",
                                                class: "interactable",
                                                '@click': "o_state.a_s_line__serial = []",
                                                innerText: "Clear",
                                            },
                                        ]
                                    },
                                ]
                            },
                            {
                                s_tag: "div",
                                class: "serial_monitor",
                                ref: "serial_monitor",
                                a_o: [
                                    {
                                        s_tag: "div",
                                        'v-for': "(s_line, n_idx) in o_state.a_s_line__serial",
                                        ':key': "n_idx",
                                        class: "serial_line",
                                        innerText: "{{ s_line }}",
                                    },
                                ]
                            },
                        ]
                    },

                    // ── RIGHT: Live Control + CLI Log ──
                    {
                        class: "esp32_col esp32_col__right",
                        a_o: [
                            // Live control
                            {
                                class: "esp32_section",
                                a_o: [
                                    { s_tag: "h2", innerText: "Live Control" },
                                    {
                                        class: "esp32_status",
                                        a_o: [
                                            {
                                                s_tag: "span",
                                                ':class': "'esp32_dot ' + (o_state.o_esp32_status ? 'connected' : 'disconnected')",
                                            },
                                            {
                                                s_tag: "span",
                                                innerText: "{{ o_state.o_esp32_status ? 'Connected (' + o_state.o_esp32_status.s_ip + ')' : 'Not connected' }}",
                                            },
                                        ]
                                    },
                                    {
                                        'v-if': "o_state.o_esp32_status",
                                        class: "esp32_status_detail",
                                        a_o: [
                                            { s_tag: "div", innerText: "SSID: {{ o_state.o_esp32_status.s_ssid }}" },
                                            { s_tag: "div", innerText: "Running: {{ o_state.o_esp32_status.b_running ? 'Yes' : 'No' }}" },
                                            { s_tag: "div", 'v-if': "o_state.o_esp32_status.b_running", innerText: "Elapsed: {{ Math.round(o_state.o_esp32_status.n_ms_elapsed / 1000) }}s" },
                                        ]
                                    },
                                    {
                                        class: "esp32_button_row",
                                        a_o: [
                                            {
                                                s_tag: "button",
                                                class: "interactable",
                                                '@click': "f_esp32_command('start')",
                                                ':disabled': "!o_state.o_esp32_status",
                                                innerText: "Start",
                                            },
                                            {
                                                s_tag: "button",
                                                class: "interactable",
                                                '@click': "f_esp32_command('stop')",
                                                ':disabled': "!o_state.o_esp32_status",
                                                innerText: "Stop",
                                            },
                                            {
                                                s_tag: "button",
                                                class: "interactable",
                                                '@click': "f_esp32_reconfigure()",
                                                ':disabled': "!o_state.o_esp32_status",
                                                innerText: "Reconfig",
                                            },
                                        ]
                                    },
                                ]
                            },
                            // CLI log / Code preview (tabbed)
                            {
                                class: "esp32_cli_log_wrap",
                                a_o: [
                                    {
                                        class: "esp32_col_header",
                                        a_o: [
                                            {
                                                class: "esp32_tab_row",
                                                a_o: [
                                                    {
                                                        s_tag: "button",
                                                        class: "interactable esp32_tab",
                                                        ':class': "{ active: s_tab__right === 'cli' }",
                                                        '@click': "s_tab__right = 'cli'",
                                                        innerText: "CLI Output",
                                                    },
                                                    {
                                                        s_tag: "button",
                                                        class: "interactable esp32_tab",
                                                        ':class': "{ active: s_tab__right === 'code' }",
                                                        '@click': "f_preview_code()",
                                                        innerText: "ESP32 Code",
                                                    },
                                                ]
                                            },
                                            {
                                                class: "esp32_button_row",
                                                a_o: [
                                                    {
                                                        s_tag: "button",
                                                        class: "interactable",
                                                        'v-if': "s_tab__right === 'cli'",
                                                        '@click': "o_state.a_o_logmsg__cli = []",
                                                        innerText: "Clear",
                                                    },
                                                    {
                                                        s_tag: "button",
                                                        class: "interactable",
                                                        'v-if': "s_tab__right === 'code'",
                                                        '@click': "f_preview_code()",
                                                        innerText: "Refresh",
                                                    },
                                                ]
                                            },
                                        ]
                                    },
                                    // CLI log tab
                                    {
                                        s_tag: "div",
                                        class: "serial_monitor cli_log",
                                        ref: "cli_log",
                                        'v-show': "s_tab__right === 'cli'",
                                        a_o: [
                                            {
                                                s_tag: "div",
                                                'v-for': "(o_log, n_idx) in o_state.a_o_logmsg__cli",
                                                ':key': "n_idx",
                                                ':class': "'serial_line ' + o_log.s_type",
                                                innerText: "{{ o_log.s_message }}",
                                            },
                                        ]
                                    },
                                    // Code preview tab
                                    {
                                        s_tag: "div",
                                        class: "serial_monitor code_preview",
                                        'v-show': "s_tab__right === 'code'",
                                        a_o: [
                                            {
                                                s_tag: "pre",
                                                innerText: "{{ s_code_preview || 'Click Refresh to generate code preview...' }}",
                                            },
                                        ]
                                    },
                                ]
                            },
                        ]
                    },
                ]
            },
        ]
    })).innerHTML,

    data: function() {
        return {
            o_state,
            b_compiling: false,
            b_serial_active: false,
            b_detecting_port: false,
            b_flash_success: false,
            s_flash_result: '',
            a_s_port__detected: [],
            s_tab__right: 'cli',
            s_code_preview: '',
        };
    },

    watch: {
        'o_state.a_s_line__serial': {
            handler: function() {
                this.$nextTick(function() {
                    let o_el = this.$refs.serial_monitor;
                    if(o_el) o_el.scrollTop = o_el.scrollHeight;
                }.bind(this));
            },
            deep: true,
        },
        'o_state.a_o_logmsg__cli': {
            handler: function() {
                this.$nextTick(function() {
                    let o_el = this.$refs.cli_log;
                    if(o_el) o_el.scrollTop = o_el.scrollHeight;
                }.bind(this));
            },
            deep: true,
        },
    },

    methods: {
        f_s_kv: function(s_key) {
            let a_o = o_state.a_o_keyvalpair || [];
            let o_kv = a_o.find(function(o) { return o.s_key === s_key; });
            return o_kv ? o_kv.s_value : '';
        },

        f_update_kv: async function(s_key, s_value) {
            let a_o = o_state.a_o_keyvalpair || [];
            let o_kv = a_o.find(function(o) { return o.s_key === s_key; });
            if(!o_kv) return;
            await o_wsmsg__syncdata.f_v_sync({
                s_name_table: 'a_o_keyvalpair',
                s_operation: 'update',
                o_data: { n_id: o_kv.n_id, s_value: s_value }
            });
        },

        f_detect_port: async function() {
            this.b_detecting_port = true;
            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__esp32_detect_port.s_name, {})
                );
                if(o_resp.v_result && o_resp.v_result.a_s_port){
                    this.a_s_port__detected = o_resp.v_result.a_s_port;
                    if(this.a_s_port__detected.length > 0){
                        this.f_update_kv('s_path_port__esp32', this.a_s_port__detected[0]);
                    }
                }
            } catch(o_err) {
                console.error('port detection failed:', o_err.message);
            }
            this.b_detecting_port = false;
        },

        f_compile_flash: async function() {
            this.b_compiling = true;
            this.s_flash_result = '';
            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__esp32_compile_flash.s_name, {})
                );
                let v_result = o_resp.v_result || {};
                this.b_flash_success = v_result.b_success;
                if(v_result.b_success){
                    this.s_flash_result = 'Flash successful!';
                    setTimeout(function() {
                        this.f_toggle_serial_monitor();
                    }.bind(this), 2000);
                } else {
                    this.s_flash_result = 'Failed: ' + (v_result.s_error || 'unknown');
                }
            } catch(o_err) {
                this.b_flash_success = false;
                this.s_flash_result = 'Error: ' + o_err.message;
            }
            this.b_compiling = false;
        },

        f_toggle_serial_monitor: async function() {
            let s_action = this.b_serial_active ? 'stop' : 'start';
            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__esp32_serial_monitor.s_name, { s_action })
                );
                if(o_resp.v_result && o_resp.v_result.b_success){
                    this.b_serial_active = !this.b_serial_active;
                }
            } catch(o_err) {
                console.error('serial monitor toggle failed:', o_err.message);
            }
        },

        f_esp32_command: async function(s_command) {
            try {
                await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__esp32_command.s_name, { s_command })
                );
            } catch(o_err) {
                console.error('esp32 command failed:', o_err.message);
            }
        },

        f_preview_code: async function() {
            this.s_tab__right = 'code';
            try {
                let o_resp = await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__esp32_preview_code.s_name, {})
                );
                if(o_resp.v_result && o_resp.v_result.s_ino){
                    this.s_code_preview = o_resp.v_result.s_ino;
                }
            } catch(o_err) {
                this.s_code_preview = 'Error generating code: ' + o_err.message;
            }
        },

        f_esp32_reconfigure: async function() {
            let o_config = {
                s_command: 'reconfigure',
                o_config: {
                    n_deg_forward: parseInt(this.f_s_kv('n_deg_forward')) || 90,
                    n_deg_backward: parseInt(this.f_s_kv('n_deg_backward')) || 90,
                    n_min_duration: parseInt(this.f_s_kv('n_min_duration')) || 5,
                    n_deg_final: parseInt(this.f_s_kv('n_deg_final')) || 180,
                    b_dir_final_forward: this.f_s_kv('s_dir_final') === 'forward',
                    n_rpm: parseFloat(this.f_s_kv('n_rpm')) || 12.0,
                },
            };
            try {
                await f_send_wsmsg_with_response(
                    f_o_wsmsg(o_wsmsg__esp32_command.s_name, o_config)
                );
            } catch(o_err) {
                console.error('esp32 reconfigure failed:', o_err.message);
            }
        },
    },
};

export { o_component__esp32 };
