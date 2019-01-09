# Homebridge Meross MSS425E Surge Protector

I have not tested this yet, but the original code was developed, tested and found to work by Robdel12, so it should be very close to working at least. Many thanks to Robdel12! This version of Robdel12's code, includes one minor change that expects an accessory's channel value to be included in the config.json. This allows (I hope) the device's three power outllets to be controlled individually. This code might work for single meross plugs also, just set the channel value to 0.

## Setup

The following instructions were written by Robdel12, and altered by me very slightly...

Assuming you have a working homebridge setup, this is how you add the
meross plugin:

- `npm i -g homebridge-meross-surge-protector` (You may need `sudo` depending on
  your homebridge setup)
- Edit your `config.json` to include the plug `name`, `authToken`, `deviceUrl`, and `channel`.

If you're setting this plug up fresh, make sure you go through the
typical meross app for initial setup. You will need to know what the
plugs IP address is on your network. You will also have to get the
auth token that the meross mobile app uses in its HTTP request
headers. I used Charles proxy and proxied to my iPhone to sniff the
network requests from the app."

The following instructions were written by BarrattJu...

I logged on to my router to confirm the IP addresses of my meross devices before sniffing their respective details.
Each mains power outlet on the surge protector is controlled via channel 1, 2, 3 etc. I believe the three switches on the device 
require the same deviceURL and authToken. There is some data duplication below but I've left it as is for now. I will update these notes as I go.

``` json
{
  "accessories": [
    {
      "accessory": "Meross",
      "name": "Meross1 Switch1",
      "deviceUrl": "http://192.168.11.11",
      "authToken": "Basic [token you sniffed yourself]",
      "channel": 1
    },
    {
      "accessory": "Meross",
      "name": "Meross1 Switch2",
      "deviceUrl": "http://192.168.11.11",
      "authToken": "Basic [token you sniffed yourself]",
      "channel": 2
    },
    {
      "accessory": "Meross",
      "name": "Meross1 Switch3",
      "deviceUrl": "http://192.168.11.11",
      "authToken": "Basic [token you sniffed yourself]",
      "channel": 3
    }
  ]
}
```
