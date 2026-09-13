SOHEL CHICKEN CENTRE - START/STOP
==================================

Copy this whole folder onto the Mac (anywhere - the Desktop is fine).

  Start SCC.command   double-click to start both apps. A browser tab opens
                       automatically once the frontend is ready.
  Stop SCC.command    double-click to stop both apps.

The paths inside both scripts already match where the apps live on this
Mac (/Users/sohelchickencentre/SOHEL/...). If those ever move, open the
.command file in TextEdit and change the two folder lines at the top.

Start SCC.command always runs the backend as ENV=prod - the app refuses to
guess which database to use, and this is the shop's real one. It finds the
backend jar whether it was built fresh (mvnw package leaves it in target/)
or copied to the project root by hand; either location works without
editing anything.


IF DOUBLE-CLICKING DOES NOTHING THE FIRST TIME
-----------------------------------------------
Copying a script onto the Mac sometimes loses its "allowed to run"
permission. Fix it once, in Terminal:

  chmod +x "/path/to/this/folder/Start SCC.command" "/path/to/this/folder/Stop SCC.command"

(Drag the folder into Terminal after typing chmod +x to fill in the path,
rather than typing it by hand.)

If macOS shows a security warning instead, right-click the file and choose
Open - that only has to be done once per file.


FOR OTHER DEVICES ON THE SAME WIFI TO USE THE APP
--------------------------------------------------
This works out of the box now for the Mac itself. For a phone or tablet on
the same wifi to open it too, one thing needs telling to the backend: which
address the phone will be visiting from.

1. Find the Mac's address on the network - in Terminal:
     ipconfig getifaddr en0
   (try en1 instead of en0 if that prints nothing)

2. In the backend folder's .env file, add this line (create it if it is not
   already there) - THAT-ADDRESS is what step 1 printed:
     FRONTEND_URL=http://localhost:3000,http://THAT-ADDRESS:3000

   (This app always runs as the "prod" profile here, which reads the allowed
   address from .env rather than from a file in the source code.)

3. Restart the backend (Stop, then Start again) for the change to take
   effect.

4. On the phone, open a browser to http://THAT-ADDRESS:3000

If the Mac's address on the network can change (most home/office routers
do this after a power cut), ask whoever manages the wifi router to give the
Mac a fixed address - a "DHCP reservation" - so step 2 does not need
repeating every time the router restarts.


LATER, MOVING TO THE CLOUD
---------------------------
Nothing here gets thrown away. See docs/running-the-stack.md in the
backend project for what changes and what does not.
