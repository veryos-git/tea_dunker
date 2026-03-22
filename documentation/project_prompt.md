
## example project: iot esp32 project

this project is going to be a tool to configure and flash a software onto a microcontroller. 

hardware: 
esp32
28byj-48 stepper motor

software:
desktop application (denojs server side, native js client side, json db)
CLI tools

make sure ever CLI command run can be visually shown in the GUI (for debugging)

make sure every configurable value will be stored in o_keyvalpair


flashing process: 
- user starts websersocket 'deno task run'
- websersocket makes sure that every software requirement is met (installs CLI tools that are required, sets permission on /dev/tty... if required)
- user opens localhost:port
- user uses GUI to configure the esp32 programm (sets stuff like wifi SSID and password, pin numbers for stepper motors)
- user connects esp32 
- user clicks 'compile and flash'
- esp32 is flashed
- GUI asks user to click 'EN' button on esp32 (maybe not neede)
- after a successfull flash the serial monitor should be started and the network connection info of the esp32 (IP, ssid) shoud be shown 


esp32 program:
this particular programm is going to be a stepper motor that can be configured to: 
- after getting power , repeat the procedure for n minutes
- the procedure: 
  - turn n degrees in one direction
  - turn n degrees in the other direction 
  
- when the n minutes are reached, a last time , turn n degrees into a certain direction.  

layout: 
make shure the whole GUI is overviewable in a full page layout. scrolling is allowed only for stuff like for example a virtual console or other logs. if there is really not enough space add toggable and moveable overlay windows for certain functions. 