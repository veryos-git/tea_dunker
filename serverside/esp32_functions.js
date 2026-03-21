// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

// ESP32 arduino-cli functions: compile, flash, serial monitor, command relay

import { s_ds, s_root_dir, s_bin__arduino_cli } from './runtimedata.js';
import { f_o_logmsg, o_wsmsg__logmsg, o_wsmsg__esp32_serial_data, f_o_wsmsg, s_o_logmsg_s_type__log, s_o_logmsg_s_type__info, s_o_logmsg_s_type__error, s_o_logmsg_s_type__warn } from '../localhost/constructors.js';

// ── helpers ──

let f_broadcast_logmsg = function(a_o_socket, o_logmsg){
    let s_msg = JSON.stringify(
        f_o_wsmsg(o_wsmsg__logmsg.s_name, o_logmsg)
    );
    for(let o_sock of a_o_socket){
        if(o_sock.readyState === WebSocket.OPEN){
            o_sock.send(s_msg);
        }
    }
};

let f_broadcast_serial_line = function(a_o_socket, s_line){
    let s_msg = JSON.stringify(
        f_o_wsmsg(o_wsmsg__esp32_serial_data.s_name, { s_line })
    );
    for(let o_sock of a_o_socket){
        if(o_sock.readyState === WebSocket.OPEN){
            o_sock.send(s_msg);
        }
    }
};

let f_o_result__run_command = async function(s_bin, a_s_arg, a_o_socket){
    let s_cmd = s_bin + ' ' + a_s_arg.join(' ');
    f_broadcast_logmsg(a_o_socket, f_o_logmsg(
        '[CMD] ' + s_cmd, true, true, s_o_logmsg_s_type__info, Date.now(), 30000
    ));

    let o_proc = new Deno.Command(s_bin, {
        args: a_s_arg,
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_output = await o_proc.output();
    let s_stdout = new TextDecoder().decode(o_output.stdout);
    let s_stderr = new TextDecoder().decode(o_output.stderr);

    if(s_stdout){
        f_broadcast_logmsg(a_o_socket, f_o_logmsg(
            s_stdout, true, true, s_o_logmsg_s_type__log, Date.now(), 30000
        ));
    }
    if(s_stderr){
        f_broadcast_logmsg(a_o_socket, f_o_logmsg(
            s_stderr, true, true, o_output.success ? s_o_logmsg_s_type__warn : s_o_logmsg_s_type__error, Date.now(), 30000
        ));
    }

    return {
        b_success: o_output.success,
        n_code: o_output.code,
        s_stdout,
        s_stderr,
    };
};

// ── arduino-cli init ──

let f_b_arduino_cli_installed = async function(){
    try {
        let o_proc = new Deno.Command(s_bin__arduino_cli, {
            args: ['version'],
            stdout: 'piped',
            stderr: 'piped',
        });
        let o_result = await o_proc.output();
        return o_result.success;
    } catch {
        return false;
    }
};

let f_init_arduino_cli = async function(){
    let b_installed = await f_b_arduino_cli_installed();
    if(!b_installed){
        console.log('[f_init_arduino_cli] arduino-cli not found, attempting install...');
        // try using the official install script
        try {
            let o_proc = new Deno.Command('bash', {
                args: ['-c', 'curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=~/.local/bin sh'],
                stdout: 'inherit',
                stderr: 'inherit',
            });
            let o_result = await o_proc.output();
            if(!o_result.success){
                console.error('[f_init_arduino_cli] install script failed');
                console.error('[f_init_arduino_cli] please install arduino-cli manually:');
                console.error('  curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh');
                return false;
            }
        } catch(o_err) {
            console.error('[f_init_arduino_cli] failed to run install script:', o_err.message);
            return false;
        }
        // verify after install
        b_installed = await f_b_arduino_cli_installed();
        if(!b_installed){
            console.error('[f_init_arduino_cli] arduino-cli still not found after install');
            return false;
        }
        console.log('[f_init_arduino_cli] arduino-cli installed');
    } else {
        console.log('[f_init_arduino_cli] arduino-cli found');
    }

    // check if esp32 core is installed
    let o_proc__core_list = new Deno.Command(s_bin__arduino_cli, {
        args: ['core', 'list', '--format', 'json'],
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_result__core_list = await o_proc__core_list.output();
    let s_core_list = new TextDecoder().decode(o_result__core_list.stdout);
    let b_esp32_core_installed = s_core_list.includes('esp32:esp32');

    if(!b_esp32_core_installed){
        console.log('[f_init_arduino_cli] installing esp32 core...');
        let o_proc__update = new Deno.Command(s_bin__arduino_cli, {
            args: ['core', 'update-index'],
            stdout: 'inherit',
            stderr: 'inherit',
        });
        await o_proc__update.output();

        // add esp32 board manager URL and install core
        let o_proc__config = new Deno.Command(s_bin__arduino_cli, {
            args: ['config', 'add', 'board_manager.additional_urls', 'https://espressif.github.io/arduino-esp32/package_esp32_index.json'],
            stdout: 'inherit',
            stderr: 'inherit',
        });
        await o_proc__config.output();

        let o_proc__update2 = new Deno.Command(s_bin__arduino_cli, {
            args: ['core', 'update-index'],
            stdout: 'inherit',
            stderr: 'inherit',
        });
        await o_proc__update2.output();

        let o_proc__install = new Deno.Command(s_bin__arduino_cli, {
            args: ['core', 'install', 'esp32:esp32'],
            stdout: 'inherit',
            stderr: 'inherit',
        });
        let o_result__install = await o_proc__install.output();
        if(!o_result__install.success){
            console.error('[f_init_arduino_cli] failed to install esp32 core');
            return false;
        }
        console.log('[f_init_arduino_cli] esp32 core installed');
    } else {
        console.log('[f_init_arduino_cli] esp32 core already installed');
    }

    // install required Arduino libraries
    let a_s_lib = ['WebSockets', 'ArduinoJson'];
    for(let s_lib of a_s_lib){
        let o_proc__lib = new Deno.Command(s_bin__arduino_cli, {
            args: ['lib', 'install', s_lib],
            stdout: 'piped',
            stderr: 'piped',
        });
        let o_result__lib = await o_proc__lib.output();
        if(o_result__lib.success){
            console.log(`[f_init_arduino_cli] library '${s_lib}' ready`);
        } else {
            console.warn(`[f_init_arduino_cli] failed to install library '${s_lib}'`);
        }
    }

    return true;
};

// ── port detection ──

let f_a_s_port__serial = async function(){
    try {
        let o_proc = new Deno.Command(s_bin__arduino_cli, {
            args: ['board', 'list', '--format', 'json'],
            stdout: 'piped',
            stderr: 'piped',
        });
        let o_result = await o_proc.output();
        let s_json = new TextDecoder().decode(o_result.stdout);
        let a_o_port = JSON.parse(s_json);
        // arduino-cli board list returns array of detected_ports
        let a_s_port = [];
        if(Array.isArray(a_o_port)){
            for(let o_port of a_o_port){
                let o_p = o_port.port || o_port;
                if(o_p.address){
                    a_s_port.push(o_p.address);
                }
            }
        }
        return a_s_port;
    } catch {
        // fallback: scan /dev/ for ttyUSB* and ttyACM*
        let a_s_port = [];
        try {
            for await(let o_entry of Deno.readDir('/dev/')){
                if(o_entry.name.startsWith('ttyUSB') || o_entry.name.startsWith('ttyACM')){
                    a_s_port.push('/dev/' + o_entry.name);
                }
            }
        } catch { /* no /dev/ access */ }
        return a_s_port;
    }
};

// ── .ino generation ──

let f_s_ino__from_o_config = function(o_config){
    let s_dir_final_bool = o_config.s_dir_final === 'forward' ? 'true' : 'false';
    return `// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.
// Generated by tee_dunker ESP32 flasher — do not edit manually

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Stepper.h>

// ── Flash-time defaults (overridden by NVS if saved values exist) ──
const char* S_WIFI_SSID_DEFAULT = "${o_config.s_wifi_ssid}";
const char* S_WIFI_PASSWORD_DEFAULT = "${o_config.s_wifi_password}";
const char* S_SERVER_IP_DEFAULT = "${o_config.s_ip__server_websocket}";
const int N_SERVER_PORT_DEFAULT = ${o_config.n_port__server_websocket};
const int N_PIN_IN1 = ${o_config.n_pin_in1};
const int N_PIN_IN2 = ${o_config.n_pin_in2};
const int N_PIN_IN3 = ${o_config.n_pin_in3};
const int N_PIN_IN4 = ${o_config.n_pin_in4};

// ── Runtime config (loaded from NVS or defaults) ──
String s_wifi_ssid;
String s_wifi_password;
String s_server_ip;
int n_server_port;
int n_deg_forward;
int n_deg_backward;
int n_min_duration;
int n_deg_final;
bool b_dir_final_forward;

// 28BYJ-48: 2048 steps per revolution (half-step mode with ULN2003)
const int N_STEP_PER_REV = 2048;
// Pin order for 28BYJ-48 with ULN2003: IN1, IN3, IN2, IN4 (swap middle two)
Stepper o_stepper(N_STEP_PER_REV, N_PIN_IN1, N_PIN_IN3, N_PIN_IN2, N_PIN_IN4);

WebSocketsClient o_ws;
WebServer o_http(80);
Preferences o_prefs;

bool b_running = false;
bool b_ws_connected = false;
unsigned long n_ms_start = 0;
unsigned long n_ms_duration = 0;

// ── NVS load/save ──

void f_load_config() {
    o_prefs.begin("teedunker", true); // read-only
    s_wifi_ssid       = o_prefs.getString("wifi_ssid", S_WIFI_SSID_DEFAULT);
    s_wifi_password   = o_prefs.getString("wifi_pass", S_WIFI_PASSWORD_DEFAULT);
    s_server_ip       = o_prefs.getString("srv_ip", S_SERVER_IP_DEFAULT);
    n_server_port     = o_prefs.getInt("srv_port", N_SERVER_PORT_DEFAULT);
    n_deg_forward     = o_prefs.getInt("deg_fwd", ${o_config.n_deg_forward});
    n_deg_backward    = o_prefs.getInt("deg_bwd", ${o_config.n_deg_backward});
    n_min_duration    = o_prefs.getInt("min_dur", ${o_config.n_min_duration});
    n_deg_final       = o_prefs.getInt("deg_final", ${o_config.n_deg_final});
    b_dir_final_forward = o_prefs.getBool("dir_final", ${s_dir_final_bool});
    o_prefs.end();
    Serial.println("[nvs] config loaded");
}

void f_save_config() {
    o_prefs.begin("teedunker", false); // read-write
    o_prefs.putString("wifi_ssid", s_wifi_ssid);
    o_prefs.putString("wifi_pass", s_wifi_password);
    o_prefs.putString("srv_ip", s_server_ip);
    o_prefs.putInt("srv_port", n_server_port);
    o_prefs.putInt("deg_fwd", n_deg_forward);
    o_prefs.putInt("deg_bwd", n_deg_backward);
    o_prefs.putInt("min_dur", n_min_duration);
    o_prefs.putInt("deg_final", n_deg_final);
    o_prefs.putBool("dir_final", b_dir_final_forward);
    o_prefs.end();
    Serial.println("[nvs] config saved");
}

// ── Helpers ──

int f_n_step__from_deg(int n_deg) {
    return (int)((long)n_deg * N_STEP_PER_REV / 360);
}

void f_send_status() {
    if (!b_ws_connected) return;
    JsonDocument o_doc;
    o_doc["s_type"] = "esp32_status";
    o_doc["s_ip"] = WiFi.localIP().toString();
    o_doc["s_ssid"] = WiFi.SSID();
    o_doc["b_running"] = b_running;
    o_doc["n_ms_elapsed"] = b_running ? (millis() - n_ms_start) : 0;
    o_doc["n_deg_forward"] = n_deg_forward;
    o_doc["n_deg_backward"] = n_deg_backward;
    o_doc["n_min_duration"] = n_min_duration;
    String s_json;
    serializeJson(o_doc, s_json);
    o_ws.sendTXT(s_json);
}

void f_run_procedure() {
    Serial.println("[stepper] forward " + String(n_deg_forward) + " deg");
    o_stepper.step(f_n_step__from_deg(n_deg_forward));
    delay(100);
    Serial.println("[stepper] backward " + String(n_deg_backward) + " deg");
    o_stepper.step(-f_n_step__from_deg(n_deg_backward));
    delay(100);
}

void f_final_turn() {
    int n_step = f_n_step__from_deg(n_deg_final);
    if (!b_dir_final_forward) n_step = -n_step;
    Serial.println("[stepper] final turn " + String(n_deg_final) + " deg " + (b_dir_final_forward ? "forward" : "backward"));
    o_stepper.step(n_step);
}

// ── ESP32 config webpage ──

String f_s_html_page() {
    String s = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
    s += "<title>ESP32 Stepper Config</title>";
    s += "<style>";
    s += "body{font-family:system-ui,sans-serif;background:#1a1a2e;color:#e0e0e0;margin:0;padding:1rem;}";
    s += "h1{color:#8b74ea;font-size:1.3rem;}";
    s += ".section{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:1rem;margin-bottom:0.75rem;}";
    s += "h2{font-size:0.85rem;color:#a0aec0;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 0.5rem 0;}";
    s += "label{display:block;font-size:0.75rem;color:#718096;margin-top:0.4rem;}";
    s += "input,select{width:100%;padding:0.4rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#e0e0e0;font:inherit;box-sizing:border-box;}";
    s += "input:focus,select:focus{border-color:#8b74ea;outline:none;}";
    s += "button{padding:0.6rem 1.5rem;background:rgba(139,116,234,0.2);color:#8b74ea;border:1px solid #8b74ea;border-radius:4px;cursor:pointer;font:inherit;font-weight:600;margin-top:0.75rem;}";
    s += "button:hover{opacity:0.8;}";
    s += ".status{font-size:0.85rem;color:#68d391;margin-top:0.5rem;}";
    s += ".row{display:flex;gap:0.5rem;} .row>div{flex:1;}";
    s += "</style></head><body>";
    s += "<h1>ESP32 Stepper Config</h1>";
    s += "<form method='POST' action='/save'>";

    // WiFi
    s += "<div class='section'><h2>WiFi</h2>";
    s += "<label>SSID</label><input name='wifi_ssid' value='" + s_wifi_ssid + "'>";
    s += "<label>Password</label><input name='wifi_pass' type='password' value='" + s_wifi_password + "'>";
    s += "</div>";

    // Server
    s += "<div class='section'><h2>Server WebSocket</h2>";
    s += "<div class='row'><div><label>IP</label><input name='srv_ip' value='" + s_server_ip + "'></div>";
    s += "<div><label>Port</label><input name='srv_port' type='number' value='" + String(n_server_port) + "'></div></div>";
    s += "</div>";

    // Stepper
    s += "<div class='section'><h2>Stepper Procedure</h2>";
    s += "<div class='row'><div><label>Forward deg</label><input name='deg_fwd' type='number' value='" + String(n_deg_forward) + "'></div>";
    s += "<div><label>Backward deg</label><input name='deg_bwd' type='number' value='" + String(n_deg_backward) + "'></div></div>";
    s += "<label>Duration (minutes)</label><input name='min_dur' type='number' value='" + String(n_min_duration) + "'>";
    s += "<div class='row'><div><label>Final turn deg</label><input name='deg_final' type='number' value='" + String(n_deg_final) + "'></div>";
    s += "<div><label>Final direction</label><select name='dir_final'>";
    s += "<option value='1'" + String(b_dir_final_forward ? " selected" : "") + ">Forward</option>";
    s += "<option value='0'" + String(!b_dir_final_forward ? " selected" : "") + ">Backward</option>";
    s += "</select></div></div>";
    s += "</div>";

    // Status + control
    s += "<div class='section'><h2>Status & Control</h2>";
    s += "<div>IP: " + WiFi.localIP().toString() + "</div>";
    s += "<div>SSID: " + WiFi.SSID() + "</div>";
    s += "<div>Running: <strong>" + String(b_running ? "Yes" : "No") + "</strong></div>";
    if (b_running) {
        unsigned long n_ms_el = millis() - n_ms_start;
        unsigned long n_sec_remaining = (n_ms_duration > n_ms_el) ? (n_ms_duration - n_ms_el) / 1000 : 0;
        s += "<div>Remaining: " + String(n_sec_remaining) + "s</div>";
    }
    s += "</div>";

    s += "<button type='submit'>Save & Apply</button>";
    s += "</form>";

    // start/stop buttons (separate forms, not inside the config form)
    s += "<div class='section'><h2>Procedure</h2>";
    s += "<div class='row'>";
    s += "<div><form method='POST' action='/start'><button style='width:100%;background:rgba(104,211,145,0.2);color:#68d391;border-color:#68d391;'" + String(b_running ? " disabled" : "") + ">Start</button></form></div>";
    s += "<div><form method='POST' action='/stop'><button style='width:100%;background:rgba(252,129,129,0.2);color:#fc8181;border-color:#fc8181;'" + String(!b_running ? " disabled" : "") + ">Stop</button></form></div>";
    s += "</div></div>";

    s += "</body></html>";
    return s;
}

void f_handle_root() {
    o_http.send(200, "text/html", f_s_html_page());
}

void f_handle_save() {
    bool b_wifi_changed = false;
    bool b_ws_changed = false;

    if (o_http.hasArg("wifi_ssid")) {
        String s_new = o_http.arg("wifi_ssid");
        if (s_new != s_wifi_ssid) { s_wifi_ssid = s_new; b_wifi_changed = true; }
    }
    if (o_http.hasArg("wifi_pass")) {
        String s_new = o_http.arg("wifi_pass");
        if (s_new != s_wifi_password) { s_wifi_password = s_new; b_wifi_changed = true; }
    }
    if (o_http.hasArg("srv_ip")) {
        String s_new = o_http.arg("srv_ip");
        if (s_new != s_server_ip) { s_server_ip = s_new; b_ws_changed = true; }
    }
    if (o_http.hasArg("srv_port")) {
        int n_new = o_http.arg("srv_port").toInt();
        if (n_new != n_server_port) { n_server_port = n_new; b_ws_changed = true; }
    }
    if (o_http.hasArg("deg_fwd"))   n_deg_forward  = o_http.arg("deg_fwd").toInt();
    if (o_http.hasArg("deg_bwd"))   n_deg_backward = o_http.arg("deg_bwd").toInt();
    if (o_http.hasArg("min_dur"))   n_min_duration = o_http.arg("min_dur").toInt();
    if (o_http.hasArg("deg_final")) n_deg_final    = o_http.arg("deg_final").toInt();
    if (o_http.hasArg("dir_final")) b_dir_final_forward = (o_http.arg("dir_final") == "1");

    f_save_config();

    if (b_running) {
        n_ms_duration = (unsigned long)n_min_duration * 60UL * 1000UL;
    }

    // redirect back to config page with saved confirmation
    String s_html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta http-equiv='refresh' content='3;url=/'>";
    s_html += "<style>body{font-family:system-ui;background:#1a1a2e;color:#68d391;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>";
    s_html += "</head><body><div><h2>Config saved!</h2><p>Redirecting...</p>";
    if (b_wifi_changed) s_html += "<p>WiFi changed — reconnecting...</p>";
    if (b_ws_changed) s_html += "<p>Server changed — reconnecting WebSocket...</p>";
    s_html += "</div></body></html>";
    o_http.send(200, "text/html", s_html);

    // apply WiFi change
    if (b_wifi_changed) {
        Serial.println("[config] WiFi changed, reconnecting...");
        WiFi.disconnect();
        delay(500);
        WiFi.begin(s_wifi_ssid.c_str(), s_wifi_password.c_str());
    }

    // apply WebSocket server change
    if (b_ws_changed) {
        Serial.println("[config] WebSocket server changed, reconnecting...");
        o_ws.disconnect();
        o_ws.begin(s_server_ip.c_str(), n_server_port, "/");
    }

    f_send_status();
}

void f_handle_start() {
    if (!b_running) {
        Serial.println("[http] start procedure");
        b_running = true;
        n_ms_start = millis();
        n_ms_duration = (unsigned long)n_min_duration * 60UL * 1000UL;
        f_send_status();
    }
    o_http.sendHeader("Location", "/");
    o_http.send(303);
}

void f_handle_stop() {
    if (b_running) {
        Serial.println("[http] stop procedure");
        b_running = false;
        f_send_status();
    }
    o_http.sendHeader("Location", "/");
    o_http.send(303);
}

// ── WebSocket event handler ──

void f_on_ws_event(WStype_t s_type, uint8_t* a_n_payload, size_t n_len) {
    switch (s_type) {
        case WStype_DISCONNECTED:
            Serial.println("[ws] disconnected");
            b_ws_connected = false;
            break;
        case WStype_CONNECTED:
            Serial.println("[ws] connected to server");
            b_ws_connected = true;
            {
                JsonDocument o_doc;
                o_doc["s_type"] = "esp32_hello";
                o_doc["s_ip"] = WiFi.localIP().toString();
                String s_json;
                serializeJson(o_doc, s_json);
                o_ws.sendTXT(s_json);
            }
            f_send_status();
            break;
        case WStype_TEXT: {
            String s_payload = String((char*)a_n_payload);
            JsonDocument o_doc;
            DeserializationError o_err = deserializeJson(o_doc, s_payload);
            if (o_err) {
                Serial.println("[ws] JSON parse error: " + String(o_err.c_str()));
                break;
            }
            String s_command = o_doc["s_command"] | "";

            if (s_command == "start") {
                Serial.println("[ws] command: start");
                b_running = true;
                n_ms_start = millis();
                n_ms_duration = (unsigned long)n_min_duration * 60UL * 1000UL;
                f_send_status();
            }
            else if (s_command == "stop") {
                Serial.println("[ws] command: stop");
                b_running = false;
                f_send_status();
            }
            else if (s_command == "reconfigure") {
                Serial.println("[ws] command: reconfigure");
                n_deg_forward = o_doc["n_deg_forward"] | n_deg_forward;
                n_deg_backward = o_doc["n_deg_backward"] | n_deg_backward;
                n_min_duration = o_doc["n_min_duration"] | n_min_duration;
                n_deg_final = o_doc["n_deg_final"] | n_deg_final;
                if (o_doc.containsKey("b_dir_final_forward")) {
                    b_dir_final_forward = o_doc["b_dir_final_forward"];
                }
                if (b_running) {
                    n_ms_duration = (unsigned long)n_min_duration * 60UL * 1000UL;
                }
                f_save_config();
                f_send_status();
            }
            else if (s_command == "status") {
                f_send_status();
            }
            break;
        }
        default:
            break;
    }
}

// ── Setup & Loop ──

void setup() {
    Serial.begin(115200);
    Serial.println();
    Serial.println("[setup] tee_dunker stepper control");

    // load config from NVS (survives power cycles)
    f_load_config();

    o_stepper.setSpeed(10);

    // connect to WiFi
    Serial.print("[wifi] connecting to ");
    Serial.println(s_wifi_ssid);
    WiFi.begin(s_wifi_ssid.c_str(), s_wifi_password.c_str());

    int n_attempt = 0;
    while (WiFi.status() != WL_CONNECTED && n_attempt < 30) {
        delay(500);
        Serial.print(".");
        n_attempt++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("[wifi] connected");
        Serial.print("[wifi] IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("[wifi] SSID: ");
        Serial.println(WiFi.SSID());
    } else {
        Serial.println();
        Serial.println("[wifi] failed to connect");
    }

    // start config web server on port 80
    o_http.on("/", f_handle_root);
    o_http.on("/save", HTTP_POST, f_handle_save);
    o_http.on("/start", HTTP_POST, f_handle_start);
    o_http.on("/stop", HTTP_POST, f_handle_stop);
    o_http.begin();
    Serial.println("[http] config server started on port 80");
    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[http] open http://");
        Serial.println(WiFi.localIP());
    }

    // connect WebSocket to desktop app server
    o_ws.begin(s_server_ip.c_str(), n_server_port, "/");
    o_ws.onEvent(f_on_ws_event);
    o_ws.setReconnectInterval(3000);

    // auto-start procedure on power-up
    Serial.println("[setup] auto-starting procedure");
    b_running = true;
    n_ms_start = millis();
    n_ms_duration = (unsigned long)n_min_duration * 60UL * 1000UL;

    Serial.println("[setup] ready");
}

void loop() {
    o_ws.loop();
    o_http.handleClient();

    // WiFi reconnect
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[wifi] reconnecting...");
        WiFi.begin(s_wifi_ssid.c_str(), s_wifi_password.c_str());
        delay(5000);
        return;
    }

    if (!b_running) {
        delay(10);
        return;
    }

    // check if duration elapsed
    unsigned long n_ms_elapsed = millis() - n_ms_start;
    if (n_ms_elapsed >= n_ms_duration) {
        Serial.println("[stepper] duration reached, performing final turn");
        f_final_turn();
        b_running = false;
        f_send_status();
        return;
    }

    f_run_procedure();

    // send periodic status (every 5 seconds)
    static unsigned long n_ms_last_status = 0;
    if (millis() - n_ms_last_status > 5000) {
        n_ms_last_status = millis();
        f_send_status();
    }
}
`;
};

// ── compile and flash ──

let f_o_result__compile_flash = async function(o_config, a_o_socket){
    // ensure sketch directory exists
    let s_path__sketch_dir = `${s_root_dir}${s_ds}esp32${s_ds}stepper_control`;
    try {
        await Deno.mkdir(s_path__sketch_dir, { recursive: true });
    } catch { /* already exists */ }

    // generate and write .ino file
    let s_ino = f_s_ino__from_o_config(o_config);
    let s_path__ino = `${s_path__sketch_dir}${s_ds}stepper_control.ino`;
    await Deno.writeTextFile(s_path__ino, s_ino);
    f_broadcast_logmsg(a_o_socket, f_o_logmsg(
        '[flash] wrote sketch to ' + s_path__ino, true, true, s_o_logmsg_s_type__info, Date.now(), 15000
    ));

    // compile
    let o_result__compile = await f_o_result__run_command(
        s_bin__arduino_cli,
        ['compile', '--fqbn', o_config.s_fqbn__esp32, s_path__sketch_dir],
        a_o_socket
    );
    if(!o_result__compile.b_success){
        return { b_success: false, s_error: 'Compilation failed', s_stderr: o_result__compile.s_stderr };
    }

    // check serial port permissions before flashing
    try {
        await Deno.stat(o_config.s_path_port__esp32);
    } catch {
        f_broadcast_logmsg(a_o_socket, f_o_logmsg(
            '[flash] serial port not found: ' + o_config.s_path_port__esp32 + ' — is the ESP32 connected?',
            true, true, s_o_logmsg_s_type__error, Date.now(), 15000
        ));
        return { b_success: false, s_error: 'Serial port not found: ' + o_config.s_path_port__esp32 };
    }

    // flash
    let o_result__upload = await f_o_result__run_command(
        s_bin__arduino_cli,
        ['upload', '-p', o_config.s_path_port__esp32, '--fqbn', o_config.s_fqbn__esp32, s_path__sketch_dir],
        a_o_socket
    );
    if(!o_result__upload.b_success){
        // check if permission error
        if(o_result__upload.s_stderr && o_result__upload.s_stderr.includes('Permission denied')){
            f_broadcast_logmsg(a_o_socket, f_o_logmsg(
                '[flash] permission denied on ' + o_config.s_path_port__esp32 + '. Try: sudo chmod 666 ' + o_config.s_path_port__esp32 + ' or add your user to the dialout group: sudo usermod -a -G dialout $USER',
                true, true, s_o_logmsg_s_type__error, Date.now(), 30000
            ));
        }
        return { b_success: false, s_error: 'Upload failed', s_stderr: o_result__upload.s_stderr };
    }

    f_broadcast_logmsg(a_o_socket, f_o_logmsg(
        '[flash] upload complete!', true, true, s_o_logmsg_s_type__info, Date.now(), 10000
    ));
    return { b_success: true };
};

// ── serial monitor ──

let o_process__serial_monitor = null;

let f_start_serial_monitor = async function(s_path_port, a_o_socket){
    // stop existing monitor if running
    f_stop_serial_monitor();

    f_broadcast_logmsg(a_o_socket, f_o_logmsg(
        '[serial] starting monitor on ' + s_path_port, true, true, s_o_logmsg_s_type__info, Date.now(), 10000
    ));

    try {
        let o_cmd = new Deno.Command(s_bin__arduino_cli, {
            args: ['monitor', '-p', s_path_port, '--config', 'baudrate=115200', '--raw'],
            stdout: 'piped',
            stderr: 'piped',
        });
        o_process__serial_monitor = o_cmd.spawn();

        // read stdout stream
        let f_read_stream = async function(o_stream, s_label){
            let o_reader = o_stream.getReader();
            let o_decoder = new TextDecoder();
            let s_buffer = '';
            try {
                while(true){
                    let { done, value } = await o_reader.read();
                    if(done) break;
                    s_buffer += o_decoder.decode(value, { stream: true });
                    let a_s_line = s_buffer.split('\n');
                    s_buffer = a_s_line.pop(); // keep incomplete line in buffer
                    for(let s_line of a_s_line){
                        f_broadcast_serial_line(a_o_socket, s_line);
                    }
                }
                // flush remaining buffer
                if(s_buffer){
                    f_broadcast_serial_line(a_o_socket, s_buffer);
                }
            } catch(o_err) {
                console.error(`[serial] ${s_label} read error:`, o_err.message);
            }
        };

        f_read_stream(o_process__serial_monitor.stdout, 'stdout');
        f_read_stream(o_process__serial_monitor.stderr, 'stderr');

        return { b_success: true };
    } catch(o_err) {
        f_broadcast_logmsg(a_o_socket, f_o_logmsg(
            '[serial] failed to start monitor: ' + o_err.message, true, true, s_o_logmsg_s_type__error, Date.now(), 10000
        ));
        return { b_success: false, s_error: o_err.message };
    }
};

let f_stop_serial_monitor = function(){
    if(o_process__serial_monitor){
        try {
            o_process__serial_monitor.kill('SIGTERM');
        } catch { /* already dead */ }
        o_process__serial_monitor = null;
    }
};

// ── ESP32 command relay ──

let o_socket__esp32 = null;

let f_set_socket__esp32 = function(o_socket){
    o_socket__esp32 = o_socket;
};

let f_o_socket__esp32 = function(){
    return o_socket__esp32;
};

let f_send_esp32_command = function(s_command, o_config__extra){
    if(!o_socket__esp32 || o_socket__esp32.readyState !== WebSocket.OPEN){
        return { b_success: false, s_error: 'ESP32 not connected' };
    }
    let o_msg = { s_command };
    if(o_config__extra){
        Object.assign(o_msg, o_config__extra);
    }
    o_socket__esp32.send(JSON.stringify(o_msg));
    return { b_success: true };
};


export {
    f_init_arduino_cli,
    f_a_s_port__serial,
    f_s_ino__from_o_config,
    f_o_result__compile_flash,
    f_start_serial_monitor,
    f_stop_serial_monitor,
    f_send_esp32_command,
    f_set_socket__esp32,
    f_o_socket__esp32,
    f_o_result__run_command,
    f_broadcast_logmsg,
};
