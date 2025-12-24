# BigHead

*Converted from: BigHead.pdf*

---

# Bighead
## **5 [th] May 2019 / Document No D19.100.16**

**Prepared By: MinatoTW**

**Machine Author: 3mrgnc3**

**Difficulty: Insane**

**Classification: Official**



Page 1 / 35


## **SYNOPSIS**

Bighead is an “Insane” difficulty windows box which deals with advanced binary exploitation,

registry enumeration, code review and NTFS ADS. The source code of the web server is found

on github which needs to be analyzed to find an overflow in a HEAD request. It can be exploited

using heap spraying and egg hunting which results in a shell. Registry enumeration leads to hex

encoded password for nginx which is used to obtain an ssh shell through port forward. On

reviewing the PHP code a file vulnerable to LFI is found which is exploited to gain a root shell.

The root flag has an ADS which is a keepass database. This is cracked using the key to gain the

final flag.


## **Skills Required**


  - Web server enumeration

  - Exploit development

  - Reverse Engineering

  - Windows enumeration

  - Code review


## **Skills Learned**


  - Heap spraying

  - Egg hunting technique

  - Extracting ADS



Page 2 / 35


​


## **ENUMERATION** **NMAP**

​



​



​



Just port 80 is running with nginx service on it.

## **NGINX - PORT 80**


Nginx was running a website depicting a cryptocurrency related company.

## GOBUSTER


Running gobuster on it found a few files,


​



​



​



The backend page redirects to /BIghead which displays an error pointing to

[http://bighead.htb/r/error_log​](http://bighead.htb/r/error_log) which was the same page.



​


Page 3 / 35


should be added to the hosts file.





Page 4 / 35


​ ​



After adding it to the hosts file the page displayed the output of phpinfo() which gave us

information about the OS.


Enumerating the code.bighead.htb vhost further, anything matching ^index was getting

redirected to /testlink.


​ ​



​ ​



​ ​



​ ​



​ ​



[Directly visiting http://code.bighead.htb/testlink​](http://code.bighead.htb/testlink) ​ redirected to

http://127.0.0.1:5080/testlink/login.php .



​ ​


Page 5 / 35



​ ​


On swapping the localhost url with the vhost, we find a page with lots of errors and path

disclosure.


Running gobuster on the testlink directory shows an interesting hit called “note”.


Page 6 / 35


Hitting the page results in a note which hints about another vhost dev.


Running gobuster on dev vhost shows many files out of which /coffee returns a 418 response

code and any request with ^blog was being redirected.





Page 7 / 35


Checking the response via Firefox tools or curl reveals another server header “BigheadWebSvr

1.0”.


A Google search reveals a github repo by the maker of the box.


The repo contains a zip file which can be downloaded.

## **CRACKING THE ZIP**


After downloading the zip file from the repo we’ll find it password protected. John the ripper can

be used to crack the zip.





Page 8 / 35


​ ​



​ ​



​ ​



​ ​



​ ​



​ ​



The password is found to be “thepipedpiper89” . Extracting from the archive using this results in

a note and few config files.


As the note says, the vulnerable software was removed from it. Maybe it was present in the older

[commits. Navigate to the first commit here​](https://github.com/3mrgnc3/BigheadWebSvr/tree/b1b4d6ed5f2298bc243cd56cab77cd6fb4e48c3d) and download the old archive. ​


Repeating the same process, the password is found to be “bighead”.


Page 9 / 35



​ ​


Extract the contents using 7z,





This time we receive a dll and an executable which runs as the web server on bighead.

## **REVERSING THE BINARY**


Using ghidra we can reverse the binary to find any exploitable functions. Run ghidra and create a

new project. Then select the code browser from the toolbar. Once the project is open go to FIle >

Import FIle > Select BigheadWebSvr.exe. Then click analyze and ignore any warnings.


To start decompiling in the symbol tree window find the Functions branch, expand it and go to

main > _main.


Page 10 / 35


The code should appear in both assembly and pseudocode on the right. In the decompile

window we see that it takes in arguments, creates a socket and if no error occurs it drops into a

while loop which listens for connections.


On receiving a connect the function ConnectionHandler is called. Double click on it to navigate.


The function receives the socket fd, then allocates some memory to copy the request data into.

Then it drops into a if-else-if nest to determine the request type. Here it’s seen that the GET

request to /coffee returns the 418 error.


Page 11 / 35


Moving further, if the request isn’t a GET or POST then it checks for a HEAD request and calls the

function _Function4.


Double click on it to navigate. We see that it receives the data request and uses strcpy to copy it

to a local buffer of length 32 and then return. As strcpy doesn’t control the number of input

characters which results in a buffer overflow.


This can be a potential exploit which needs dynamic analysis.

## **EXPLOIT DEVELOPMENT**


From the phpmyadmin page found earlier we know that the target is running 32 bit Windows

[server 2008. It can be downloaded from ​here so that we can emulate the target environment.](https://www.microsoft.com/en-gb/download/confirmation.aspx?id=5023)


Page 12 / 35


​ ​


​



Download the Immunity Debugger from [here​](https://www.immunityinc.com/products/debugger/) [and the plugin mona.py from ​here. After installing​](https://github.com/corelan/mona/blob/master/mona.py)

immunity place mona.py into the plugins folder at “C:\Program Files\Immunity Inc\Immunity

Debugger\PyCommands”.


Trying to run the binary results in an error about a missing dependency.


A quick google search leads us to [sourceforge​](https://sourceforge.net/projects/mingw/files/MinGW/Base/mingwrt/mingwrt-5.0.2/) from where we can download the

_**libmingwex-5.0.2-mingw32-dll-0.tar.xz**_ package. Extract the contents and transfer the dll to the

Windows VM and place it in the same folder as the executable.



​ ​


​



​ ​


​



​ ​


​



​ ​


​


Running the executable now shouldn’t return an error and the server should start listening.


On checking netstat we find port 8008 listening which can be confirmed from the nginx config.


Page 13 / 35



​ ​


​


From static analysis we know that the handler for the HEAD request is vulnerable to buffer

overflow. So, lets try sending is a payload greater than 32 characters.


Before that turn off the firewall, run CMD as Administrator and type,




## DETERMINING THE BUFFER SIZE

Now to send our payload,





And it’s seen that the server crashes instantly. Restart the server and fire up immunity.


Page 14 / 35


Click on FIle > Attach > BigheadWebSvr and then hit F9 to run it. Then sending the curl request,





We see EIP getting overwritten by our payload. Let’s determine the buffer size, use mona to

create a pattern





Now copy the generated pattern as use it to make a curl request.



Page 15 / 35


Right click on ESP and follow in dump, here the pattern can be found at memory address

0131FB40 and the ESP being at 0131FB28 with the contents AA0A.


The difference comes out as 24 in hex which is 36 bytes. And as each character is 2 bits in size,

we can fit in 72 characters in our buffer.





Lets confirm this to see if we control EIP.





It’s confirm that we can control EIP.

## USING JMP EAX


Now we need to find a JMP EAX instruction so that we can point our EIP to it and then jump to

the top of the buffer to execute our shellcode. But before that let us examine the binary

restrictions in effect.


Page 16 / 35


We notice that all protections are turned off for the binary as well as for the DLL dependencies.


To turn off system wide DEP, run CMD as Administrator and issue.





And reboot. After that, run immunity again and right click > Search for > All commands in all

modules and enter JMP EAX.


We see that bHeadSvr.dll has it available at 625012F2 which is F2125062 in Little Endian.


Right click on the instruction and click Toggle breakpoint.


Replace the B’s with the address and run the program again.





Page 17 / 35


We see that EIP hits on our breakpoint and on continuing we jump to the address of EAX.


Now that we can jump to eax, we need to place our shellcode on the stack. But due to a small

buffer size it’s not possible to fit it in. This calls for the need of an Egg hunter.

## EGG HUNTER


An egg hunter is a piece of code which searches for our shellcode in the memory of the process

by finding a particular string prefixed to it.


We can use mona to create an egghunter shellcode. By default the egg is set to w00t but it can

be any four character string.





Here I’m using “HTB!” As my egg. Mona generates the shellcode which we copy and use in our

script.


Page 18 / 35


Here’s what the script looks like 




Page 19 / 35


Page 20 / 35


We’re using msfvenom to generate the shellcode. Make sure to use the -b switch to avoid bad

characters. Next we spray the heap with the payload after prepending the egg to it. We need to

send the request manually to avoid url encoding and extra headers. Then we trigger the

egghunter by sending a HEAD request which finds the shellcode and executes it.


Executing it resulted in a shell.


Page 21 / 35


## **FOOTHOLD**

Now that we have a working exploit, all that is left is to try it on the box. But before that we need

to make a minor adjustment. Due to the nginx reverse proxy our payload gets url encoded while

passing through it. We can fix this by manually deleting the header or specifying an encoding

type. Let’s gzip encode our payload and specify it in our header. The change is made here,





We manually specified gzip encoding and used zlib to compress the shellcode so that proxy

doesn’t destroy it with url encoding.


Note: Depending on the load and number of users the egghunter might take a while to return a

shell, so be patient.


Page 22 / 35


​ ​


​ ​


## **LATERAL MOVEMENT** **ENUMERATION**

After getting a shell as nelson, we run an enumeration script like [JAWS​](https://github.com/411Hall/JAWS/blob/master/jaws-enum.ps1) . ​


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


After running the script these are the points to be noted down 
## Bitvise SSH Server


An SSH server is running on the box with the executable BvSshServer.exe. A quick Google

[search leads us to ”Bitvise SSH Server​](https://www.bitvise.com/ssh-server) ”. ​


On listing the ports which are listening, an uncommon port 2020 is found to be open. So chances

are that the SSH Server is listening on 2020.

## APACHE/XAMPP RUNNING AS SYSTEM


Page 23 / 35



​ ​


​ ​


The process httpd.exe is an executable run by the Apache server located at

C:\xampp\apache\bin\httpd.exe. As we can’t see the process owner it should be running as

SYSTEM or another high privilege user.

## **ENUMERATING REGISTRY**


We look for registry keys which have passwords in it using reg query.





An uncommon key for nginx is found with a PasswordHash.


The hash is hex encoded which can be decoded using xxd.


It looks like a troll. Let’s query the entire key to see other information in it.





Looks like it’s for the nginx proxy configuration. A new value for Authenticate field is found which
again is a hex encoded hash. This is decoded using xxd.

The null bytes are to be removed which are a result of UTF-16 encoding on Windows.


Page 24 / 35


​


​ ​



​


​ ​



​


​ ​



​


​ ​



Decoding the hash gives us a password string “ **H73BpUY2Uq9U-Yugyt5FYUbY0-U87t87** ​ ”.


​ ​



​


​ ​



​


​ ​



​


​ ​



​

## **SSH AS NGINX USER**


As the SSH Server is listening on localhost we need to forward it to be able to connect. We can

[use chisel​](https://github.com/jpillora/chisel/releases) ​ to do the job for us.


Download the Linux and Windows binaries and then transfer the Windows binary to the box.



​


​ ​



​


​ ​



​


​ ​


Page 25 / 35


Next run the server locally on Linux with,





And then on Bighead run the client,





This will forward connections to our localhost port 2222 to localhost 2020 on the box.


Then ssh in as nginx using the password we obtained earlier.





Which lands us into the bitvise shell.



Page 26 / 35


## **PRIVILEGE ESCALATION** **INSPECTING PHP FILES**

We land in a shell which has all the files required by the webserver to run. There’s a folder named

apps which contains the testlink folder which we came across during the initial enumeration.


All the files are owned by the Administrators group. So we can’t write a file to get it executed as

SYSTEM. We see the file linkto.php was edited recently. We transfer the file to inspect it.





The file is from the Testlink package however, some custom code was added to it.



We see that it loads the plugin through the PiperCoinID parameter only if the PiperID is set.

Searching for these parameters in the file we find that the variable PiperCoinAuth is included on

line 62.





Page 27 / 35


Using this we can include random files as there’s no filtering on the PiperCoinID parameter and
execute php code from the web page. We write a php file to C:\Users\Public folder from nelson’s
shell. Create a file pwn.php with contents,





The transfer it to the box,





Now we can execute code from the linkto.php file on code.bighead.htb .


As it’s seen whoami got executed and Apache is running as System.



Page 28 / 35


## **SYSTEM SHELL**

We use the vulnerability to download and execute a shell on the target. The URL would be,





URL encode the payload and send the request to receive a shell as SYSTEM.


The user flag can be found at C:\Users\nginx\Desktop .



Page 29 / 35


## **CRACKING KEEPASS DATABASE**

On navigating to Administrator’s Desktop the flag isn’t seen as it’s hidden. It can be viewed using

“dir /ah”.


The flag is another troll but on checking the ADS ( Alternate Data Streams ) we see one for

root.txt.





Page 30 / 35


To view the contents use,





The file appears to have binary information and we’ll have to transfer it for further inspection.


First encode the file using certutil and the copy it locally to decode and save.





We notice that the file is a Keepass 2 database.



Page 31 / 35


## CRACKING THE DB

The keepass config is generally saved in the %APPDATA% folder of the user which here is

C:\Users\Administrator\AppData\Roaming .


From the config file it’s found that the database needs both a password and keyfile to unlock.

The keyfile is located at C:\Users\Administrator\Pictures\admin.png .



Transfer the admin.png by encoding it with base64 and then decoding it locally.





Page 32 / 35


​ ​



​ ​



We’ll use the keeepass2john utility from JTR suite to get the hash. Make sure you have the latest
[version, if not grab it from here - https://github.com/magnumripper/JohnTheRipper​](https://github.com/magnumripper/JohnTheRipper) . ​



​ ​



​ ​



​ ​


Then crack it using rockyou.txt which should be fairly fast. The password is obtained as
“darkness”.


Page 33 / 35



​ ​


We can use keepass2 on Linux to open the file. Navigate to the keepass database and then enter
the password “darkness” and choose the keyfile admin.png. It results in an entry for Gilfoyle with
root.txt hash in it.


Page 34 / 35


## **APPENDIX** **Installing John the Ripper**




## **Setting up ghidra**




## **Mona.py command manual**

[https://www.corelan.be/index.php/2011/07/14/mona-py-the-manual/](https://www.corelan.be/index.php/2011/07/14/mona-py-the-manual/)

## **Egghunter in depth**


[http://www.hick.org/code/skape/papers/egghunt-shellcode.pdf](http://www.hick.org/code/skape/papers/egghunt-shellcode.pdf)


[https://www.fuzzysecurity.com/tutorials/expDev/4.html](https://www.fuzzysecurity.com/tutorials/expDev/4.html)



Page 35 / 35


