// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.
import { s_ds, s_root_dir, n_port } from "./runtimedata.js";


let o_o_keyvalpair__default = {

    o_keyvalpair__s_path_absolute__filebrowser : {
        s_key: 's_path_absolute__filebrowser',
        s_value: s_root_dir
    },
    o_keyvalpair__s_name_model_selected : {
        s_key: 's_name_model_selected',
        s_value: 'o_keyvalpair',
    },
    o_keyvalpair__s_path_page_selected : {
        s_key: 's_path_page_selected',
        s_value: '/esp32',
    },
    o_keyvalpair__s_root_dir : {
        s_key: 's_root_dir',
        s_value: s_root_dir,
    },
    o_keyvalpair__s_ds : {
        s_key: 's_ds',
        s_value: s_ds,
    },
    // ESP32 WiFi config
    o_keyvalpair__s_wifi_ssid : {
        s_key: 's_wifi_ssid',
        s_value: 'MyNetwork',
    },
    o_keyvalpair__s_wifi_password : {
        s_key: 's_wifi_password',
        s_value: 'changeme',
    },
    // ESP32 stepper motor pin config (ULN2003 driver)
    o_keyvalpair__n_pin_in1 : {
        s_key: 'n_pin_in1',
        s_value: '19',
    },
    o_keyvalpair__n_pin_in2 : {
        s_key: 'n_pin_in2',
        s_value: '18',
    },
    o_keyvalpair__n_pin_in3 : {
        s_key: 'n_pin_in3',
        s_value: '5',
    },
    o_keyvalpair__n_pin_in4 : {
        s_key: 'n_pin_in4',
        s_value: '17',
    },
    // stepper procedure config
    o_keyvalpair__n_deg_forward : {
        s_key: 'n_deg_forward',
        s_value: '90',
    },
    o_keyvalpair__n_deg_backward : {
        s_key: 'n_deg_backward',
        s_value: '90',
    },
    o_keyvalpair__n_min_duration : {
        s_key: 'n_min_duration',
        s_value: '5',
    },
    o_keyvalpair__n_deg_final : {
        s_key: 'n_deg_final',
        s_value: '180',
    },
    o_keyvalpair__s_dir_final : {
        s_key: 's_dir_final',
        s_value: 'forward',
    },
    o_keyvalpair__n_rpm : {
        s_key: 'n_rpm',
        s_value: '12.0',
    },
    // ESP32 device config
    o_keyvalpair__s_path_port__esp32 : {
        s_key: 's_path_port__esp32',
        s_value: '/dev/ttyUSB0',
    },
    o_keyvalpair__s_fqbn__esp32 : {
        s_key: 's_fqbn__esp32',
        s_value: 'esp32:esp32:esp32',
    },
    // server websocket config (for ESP32 to connect back)
    o_keyvalpair__s_ip__server_websocket : {
        s_key: 's_ip__server_websocket',
        s_value: '192.168.1.100',
    },
    o_keyvalpair__n_port__server_websocket : {
        s_key: 'n_port__server_websocket',
        s_value: String(n_port),
    },
}

let a_o_data_default = [
    ...Object.values(o_o_keyvalpair__default).map(function(o){
        return {o_keyvalpair: o}
    }),
]


export {
    a_o_data_default,
    o_o_keyvalpair__default
}
