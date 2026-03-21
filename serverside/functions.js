// Copyright (C) [2026] [Jonas Immanuel Frey] - Licensed under GPLv2. See LICENSE file for details.

// backend utility functions
// add shared server-side helper functions here and import them where needed

import { s_ds } from './runtimedata.js';
import { s_db_create, s_db_read, s_db_update, s_db_delete } from '../localhost/runtimedata.js';
import { a_o_wsmsg, f_o_model_instance, f_s_name_table__from_o_model, o_model__o_fsnode, o_wsmsg__deno_copy_file, o_wsmsg__deno_mkdir, o_wsmsg__deno_stat, o_wsmsg__f_a_o_fsnode, o_wsmsg__f_delete_table_data, o_wsmsg__f_v_crud__indb, o_wsmsg__logmsg, o_wsmsg__set_state_data, o_wsmsg__syncdata, o_wsmsg__esp32_compile_flash, o_wsmsg__esp32_serial_data, o_wsmsg__esp32_command, o_wsmsg__esp32_detect_port, o_wsmsg__esp32_serial_monitor, o_wsmsg__esp32_preview_code } from '../localhost/constructors.js';
import { f_v_crud__indb, f_db_delete_table_data } from './database_functions.js';
import { f_o_result__compile_flash, f_a_s_port__serial, f_start_serial_monitor, f_stop_serial_monitor, f_send_esp32_command, f_s_ino__from_o_config } from './esp32_functions.js';

let f_a_o_fsnode = async function(
    s_path,
    b_recursive = false,
    b_store_in_db = false
) {
    let a_o = [];

    if (!s_path) {
        console.error('Invalid path:', s_path);
        return a_o;
    }
    if (!s_path.startsWith(s_ds)) {
        console.error('Path is not absolute:', s_path);
        return a_o;
    }

    try {
        for await (let o_dir_entry of Deno.readDir(s_path)) {
            let s_path_absolute = `${s_path}${s_ds}${o_dir_entry.name}`;

            let o_fsnode = f_o_model_instance(
                o_model__o_fsnode,
                {
                    s_path_absolute,
                    s_name: s_path_absolute.split(s_ds).at(-1),
                    b_folder: o_dir_entry.isDirectory,
                }
            );
            if(b_store_in_db){
                let s_name_table__fsnode = f_s_name_table__from_o_model(o_model__o_fsnode);
                let o_fsnode__fromdb = (o_wsmsg__syncdata.f_v_sync({s_name_table: s_name_table__fsnode, s_operation: 'read', o_data: { s_path_absolute }}) || []).at(0);
                if (o_fsnode__fromdb) {
                    o_fsnode.n_id = o_fsnode__fromdb.n_id;
                } else {
                    let o_fsnode__created = o_wsmsg__syncdata.f_v_sync({s_name_table: s_name_table__fsnode, s_operation: 'create', o_data: { s_path_absolute, b_folder: o_dir_entry.isDirectory }});
                    o_fsnode.n_id = o_fsnode__created.n_id;
                }
                if (o_dir_entry.isDirectory && b_recursive) {
                    o_fsnode.a_o_fsnode = await f_a_o_fsnode(s_path_absolute, b_recursive);
                }
            }

            a_o.push(o_fsnode);
        }
    } catch (o_error) {
        console.error(`Error reading directory: ${s_path}`, o_error.message);
        console.error(o_error.stack);
    }

    a_o.sort(function(o_a, o_b) {
        if (o_a.b_folder === o_b.b_folder) return (o_a.s_name || '').localeCompare(o_b.s_name || '');
        return o_a.b_folder ? -1 : 1;
    });

    return a_o;
};



// WARNING: the following deno_copy_file, deno_stat, deno_mkdir handlers expose raw Deno APIs
// to any connected WebSocket client with arbitrary arguments. Fine for local dev use,
// but must be restricted or removed before any network-exposed deployment.
o_wsmsg__deno_copy_file.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return Deno.copyFile(...a_v_arg);
}
o_wsmsg__deno_stat.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return Deno.stat(...a_v_arg);
}
o_wsmsg__deno_mkdir.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return Deno.mkdir(...a_v_arg);
}
o_wsmsg__f_v_crud__indb.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return f_v_crud__indb(...a_v_arg);
}
o_wsmsg__f_delete_table_data.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return f_db_delete_table_data(...a_v_arg);
}
o_wsmsg__f_a_o_fsnode.f_v_server_implementation = function(o_wsmsg){
    let a_v_arg = Array.isArray(o_wsmsg.v_data) ? o_wsmsg.v_data : [];
    return f_a_o_fsnode(...a_v_arg);
}
o_wsmsg__logmsg.f_v_server_implementation = function(o_wsmsg){
    let o_logmsg = o_wsmsg.v_data;
    if(o_logmsg.b_consolelog){
        console[o_logmsg.s_type](o_logmsg.s_message);
    }
    return null;
}
o_wsmsg__set_state_data.f_v_server_implementation = function(o_wsmsg, o_wsmsg__existing, o_state){
    o_state[o_wsmsg.v_data.s_property] = o_wsmsg.v_data.value;
    return null;
}

// reference to all connected sockets, set by main server file
let a_o_socket__ref = [];
let f_set_a_o_socket__ref = function(a_o_socket){ a_o_socket__ref = a_o_socket; };

// helper: build config object from keyvalpair state
let f_o_config__from_o_state = function(o_state){
    let a_o_kv = o_state.a_o_keyvalpair || [];
    let f_s_val = function(s_key){
        let o_kv = a_o_kv.find(function(o){ return o.s_key === s_key; });
        return o_kv ? o_kv.s_value : '';
    };
    return {
        s_wifi_ssid: f_s_val('s_wifi_ssid'),
        s_wifi_password: f_s_val('s_wifi_password'),
        n_pin_in1: f_s_val('n_pin_in1'),
        n_pin_in2: f_s_val('n_pin_in2'),
        n_pin_in3: f_s_val('n_pin_in3'),
        n_pin_in4: f_s_val('n_pin_in4'),
        n_deg_forward: f_s_val('n_deg_forward'),
        n_deg_backward: f_s_val('n_deg_backward'),
        n_min_duration: f_s_val('n_min_duration'),
        n_deg_final: f_s_val('n_deg_final'),
        s_dir_final: f_s_val('s_dir_final'),
        s_path_port__esp32: f_s_val('s_path_port__esp32'),
        s_fqbn__esp32: f_s_val('s_fqbn__esp32'),
        s_ip__server_websocket: f_s_val('s_ip__server_websocket'),
        n_port__server_websocket: f_s_val('n_port__server_websocket'),
    };
};

o_wsmsg__esp32_compile_flash.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let o_config = f_o_config__from_o_state(o_state);
    // stop serial monitor before flashing (same port)
    f_stop_serial_monitor();
    return await f_o_result__compile_flash(o_config, a_o_socket__ref);
};

o_wsmsg__esp32_detect_port.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let a_s_port = await f_a_s_port__serial();
    return { a_s_port };
};

o_wsmsg__esp32_serial_monitor.f_v_server_implementation = async function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let v_data = o_wsmsg.v_data || {};
    let s_action = v_data.s_action || 'start';
    if(s_action === 'stop'){
        f_stop_serial_monitor();
        return { b_success: true };
    }
    let o_config = f_o_config__from_o_state(o_state);
    return await f_start_serial_monitor(o_config.s_path_port__esp32, a_o_socket__ref);
};

o_wsmsg__esp32_preview_code.f_v_server_implementation = function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let o_config = f_o_config__from_o_state(o_state);
    let s_ino = f_s_ino__from_o_config(o_config);
    return { s_ino };
};

o_wsmsg__esp32_command.f_v_server_implementation = function(o_wsmsg, o_wsmsg__existing, o_state, o_socket__sender){
    let v_data = o_wsmsg.v_data || {};
    let s_command = v_data.s_command || '';
    let o_config__extra = v_data.o_config || null;
    return f_send_esp32_command(s_command, o_config__extra);
};

let f_v_result_from_o_wsmsg = async function(
    o_wsmsg,
    o_state,
    o_socket__sender
){
    let o_wsmsg__existing = a_o_wsmsg.find(o=>o.s_name === o_wsmsg.s_name);
    if(!o_wsmsg__existing){
        console.error('No such wsmsg:', o_wsmsg.s_name);
        return null;
    }
    if(!o_wsmsg__existing.f_v_server_implementation) {
        console.error('No server implementation for wsmsg:', o_wsmsg.s_name);
        return null;
    }
    return o_wsmsg__existing.f_v_server_implementation(
        o_wsmsg,
        o_wsmsg__existing,
        o_state,
        o_socket__sender
    );

}

export {
    f_a_o_fsnode,
    f_v_result_from_o_wsmsg,
    f_set_a_o_socket__ref,
};
