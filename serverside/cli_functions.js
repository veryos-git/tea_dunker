// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under GPLv2. See LICENSE file for details.

// functions that spawn CLI subprocesses

import { s_ds, s_root_dir } from './runtimedata.js';


let f_install_linux_binary = async function(s_name_binary){
    // check if already available via PATH (which) before falling back to absolute path
    let o_proc__which = new Deno.Command('which', {
        args: [s_name_binary],
        stdout: 'piped',
        stderr: 'piped',
    });
    let o_result__which = await o_proc__which.output();
    if (o_result__which.success) {
        let s_path__found = new TextDecoder().decode(o_result__which.stdout).trim();
        console.log(`[f_install_linux_binary] ${s_name_binary} already installed at ${s_path__found}`);
        return;
    }

    console.log(`[f_install_linux_binary] ${s_name_binary} not found, attempting to install...`);

    // try apt-get first (debian/ubuntu)
    let o_proc__apt = new Deno.Command('sudo', {
        args: ['apt-get', 'install', '-y', s_name_binary],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__apt = await o_proc__apt.output();
    if (o_result__apt.success) {
        console.log(`[f_install_linux_binary] ${s_name_binary} installed via apt-get`);
        return;
    }

    // try pip (python packages like glances)
    let s_path__pip = 'pip3';
    let o_proc__pip = new Deno.Command(s_path__pip, {
        args: ['install', s_name_binary],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__pip = await o_proc__pip.output();
    if (o_result__pip.success) {
        console.log(`[f_install_linux_binary] ${s_name_binary} installed via pip3`);
        return;
    }

    // try snap as last resort
    let o_proc__snap = new Deno.Command('sudo', {
        args: ['snap', 'install', s_name_binary],
        stdout: 'inherit',
        stderr: 'inherit',
    });
    let o_result__snap = await o_proc__snap.output();
    if (o_result__snap.success) {
        console.log(`[f_install_linux_binary] ${s_name_binary} installed via snap`);
        return;
    }

    console.error(`[f_install_linux_binary] failed to install ${s_name_binary} via apt-get, pip3, or snap`);
}



export {
    f_install_linux_binary,
};
