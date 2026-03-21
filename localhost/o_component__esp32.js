// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

import { o_state, f_send_wsmsg_with_response, o_wsmsg__syncdata } from './index.js';

import {
    f_o_html_from_o_js,
} from "./lib/handyhelpers.js"

import {
    f_o_wsmsg,
    o_wsmsg__esp32_compile_flash,
    o_wsmsg__esp32_serial_monitor,
    o_wsmsg__esp32_command,
    o_wsmsg__esp32_detect_port,
    s_name_prop_id,
} from './constructors.js';

let o_component__esp32 = {
    name: 'component-esp32',
    template: (await f_o_html_from_o_js({
        class: "esp32_page",
        a_o: [
            // ── header ──
            {
                s_tag: "h2",
                innerText: "ESP32 Stepper Motor Control",
            },

            // ── config form ──
            {
                class: "esp32_config",
                a_o: [
                    // WiFi section
                    {
                        class: "esp32_section",
                        a_o: [
                            { s_tag: "h3", innerText: "WiFi" },
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
                    // Server WebSocket section
                    {
                        class: "esp32_section",
                        a_o: [
                            { s_tag: "h3", innerText: "Server WebSocket (for ESP32 to connect back)" },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Server IP" },
                                    { s_tag: "input", type: "text", ':value': "f_s_kv('s_ip__server_websocket')", '@change': "f_update_kv('s_ip__server_websocket', $event.target.value)" },
                                ]
                            },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Server Port" },
                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_port__server_websocket')", '@change': "f_update_kv('n_port__server_websocket', $event.target.value)" },
                                ]
                            },
                        ]
                    },
                    // Stepper pins section
                    {
                        class: "esp32_section",
                        a_o: [
                            { s_tag: "h3", innerText: "Stepper Pins (ULN2003 → 28BYJ-48)" },
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
                    // Stepper procedure section
                    {
                        class: "esp32_section",
                        a_o: [
                            { s_tag: "h3", innerText: "Stepper Procedure" },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Forward degrees" },
                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_deg_forward')", '@change': "f_update_kv('n_deg_forward', $event.target.value)" },
                                ]
                            },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Backward degrees" },
                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_deg_backward')", '@change': "f_update_kv('n_deg_backward', $event.target.value)" },
                                ]
                            },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Duration (minutes)" },
                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_min_duration')", '@change': "f_update_kv('n_min_duration', $event.target.value)" },
                                ]
                            },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Final turn degrees" },
                                    { s_tag: "input", type: "number", ':value': "f_s_kv('n_deg_final')", '@change': "f_update_kv('n_deg_final', $event.target.value)" },
                                ]
                            },
                            {
                                class: "esp32_field",
                                a_o: [
                                    { s_tag: "label", innerText: "Final turn direction" },
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
                    // Device section
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
                                            { s_tag: "label", innerText: "Serial Port" },
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
                                        innerText: "{{ b_detecting_port ? 'Scanning...' : 'Detect Ports' }}",
                                    },
                                ]
                            },
                        ]
                    },
                ]
            },

            // ── compile & flash ──
            {
                class: "esp32_section esp32_flash",
                a_o: [
                    { s_tag: "h3", innerText: "Compile & Flash" },
                    {
                        class: "esp32_button_row",
                        a_o: [
                            {
                                s_tag: "button",
                                class: "interactable esp32_btn_flash",
                                '@click': "f_compile_flash()",
                                ':disabled': "b_compiling",
                                innerText: "{{ b_compiling ? 'Compiling & Flashing...' : 'Compile & Flash' }}",
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

            // ── serial monitor ──
            {
                class: "esp32_section",
                a_o: [
                    { s_tag: "h3", innerText: "Serial Monitor" },
                    {
                        class: "esp32_button_row",
                        a_o: [
                            {
                                s_tag: "button",
                                class: "interactable",
                                '@click': "f_toggle_serial_monitor()",
                                innerText: "{{ b_serial_active ? 'Stop Monitor' : 'Start Monitor' }}",
                            },
                            {
                                s_tag: "button",
                                class: "interactable",
                                '@click': "o_state.a_s_line__serial = []",
                                innerText: "Clear",
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

            // ── live control ──
            {
                class: "esp32_section",
                a_o: [
                    { s_tag: "h3", innerText: "Live Control" },
                    {
                        class: "esp32_status",
                        a_o: [
                            {
                                s_tag: "span",
                                ':class': "'esp32_dot ' + (o_state.o_esp32_status ? 'connected' : 'disconnected')",
                            },
                            {
                                s_tag: "span",
                                innerText: "{{ o_state.o_esp32_status ? 'ESP32 connected (' + o_state.o_esp32_status.s_ip + ')' : 'ESP32 not connected' }}",
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
                                innerText: "Reconfigure",
                            },
                        ]
                    },
                ]
            },

            // ── CLI output log ──
            {
                class: "esp32_section",
                a_o: [
                    { s_tag: "h3", innerText: "CLI Output" },
                    {
                        s_tag: "div",
                        class: "serial_monitor cli_log",
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
                        // auto-select first port
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
                    // auto-start serial monitor after flash
                    setTimeout(function() {
                        this.f_toggle_serial_monitor();
                    }.bind(this), 2000);
                } else {
                    this.s_flash_result = 'Flash failed: ' + (v_result.s_error || 'unknown error');
                }
            } catch(o_err) {
                this.b_flash_success = false;
                this.s_flash_result = 'Flash error: ' + o_err.message;
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

        f_esp32_reconfigure: async function() {
            let o_config = {
                s_command: 'reconfigure',
                o_config: {
                    n_deg_forward: parseInt(this.f_s_kv('n_deg_forward')) || 90,
                    n_deg_backward: parseInt(this.f_s_kv('n_deg_backward')) || 90,
                    n_min_duration: parseInt(this.f_s_kv('n_min_duration')) || 5,
                    n_deg_final: parseInt(this.f_s_kv('n_deg_final')) || 180,
                    b_dir_final_forward: this.f_s_kv('s_dir_final') === 'forward',
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
