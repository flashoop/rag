# Hackback

*Converted from: Hackback.pdf*

---

# Hackback
## **29 [th] May 2019 / Document No D19.100.27**

**Prepared By: MinatoTW**

**Machine Author: decoder & yuntao**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 46


## **SYNOPSIS**

Hackback is an insane difficulty Windows box with some good techniques at play. A GoPhish

website is discovered which leads us to some phishing vhosts. While fuzzing for files a javascript

file is discovered which is rot13 encoded. It contains sensitive information about an admin page

which leads to RCE vulnerability. PHP disabled_functions are in effect, and so ASPX code is used

to tunnel and bypass the firewall.


Enumeration of the file system leads to a code injection vulnerability in a configuration file, from

which named pipe impersonation can be performed. Enumeration reveals that the user has

permissions on a service, which allows for arbitrary writes to the file system. This is exploited to

copy a DLL to System32, and triggering it using the DiagHub service to gain a SYSTEM shell.


## **Skills Required**


  - Enumeration

  - Reverse Engineering

  - Modifying exploit code


## **Skills Learned**


  - ASPX tunneling

  - Named pipe impersonation

  - Exploiting arbitrary writes



Page 2 / 46


## **ENUMERATION** **NMAP**





IIS is running on port 80, and an unknown service is running on port 6666. Nmap guesses this to

be HTTPAPI, which allows HTTP 2.0 communication between applications. We’ll save it for

investigation in the later stages. Port 64831 seems to be running some HTTPS application.


Page 3 / 46


## **PORT 6666 ( HTTP2 )**

From the nmap scan we know that port 6666 is running HTTP 2.0 API. We can use curl to request

HTTP 2.0. Let’s try that.





We see that the page responds with a “Missing command” error. Let’s try using some commands

such as whoami.


It responds with NT AUTHORITY\NETWORK SERVICE among other information. Let’s try using

help to see if some help menu exists.





We get a list of commands such a services, ipconfig etc..


From the info command we come to know that the server is running Windows server 19.


Page 4 / 46


Trying the netstat commands gives us a lot of information among which there’s information about

a service running on local port 5985 which could be WinRM.


Let’s look at the services now.





Among the other common services we find a strange name.


This service is running as LocalSystem and isn’t a default Windows service name. Let’s save it for

later.

## **PORT 64831 ( GOPHISH )**


Navigating to port 64831 we see some cryptic response.


Page 5 / 46


​ ​



But nmap showed the page to be running HTTPS, we browse to https://10.10.10.128:64831/.


After accepting the certificate we see a GoPhish login page. Searching for GoPhish default
[credentials we find them in the documentation​](https://docs.getgophish.com/user-guide/getting-started) as admin / gophish. ​


Trying to log in with these credentials gets us into the admin page.


Page 6 / 46



​ ​



​ ​


Going through the application we find some email templates.


Click on the edit template on the right shows the source code of the template. Here’s a snippet

from the HackTheBox template.





Page 7 / 46


The templates targets a user with a mail from admin@hackthebox.htb and link leading to

http://www.hackthebox.htb. Maybe this is the vhost on the box ? Let’s confirm this by adding it to

the hosts file.





Now browsing to www.hackthebox.htb we see an exact copy of the HTB login page.


Enter some credentials and submitting sends a POST request to the same page. So they must be

getting stored somewhere else. There are similar pages for paypal, facebook, twitter in their

respective vhosts. Looking at the admin template we find another vhost,


Add this to the hosts file for further enumeration.


Page 8 / 46


## **IIS**

Browsing to port 80 we just see an image of donkey without any other helpful information. Apart

from the phishing templates we found another Admin vhost. Let’s look at it.


We see another login page and looking at the page source we find the login isn’t configured,

there’s also a comment.


This points towards a JavaScript file in the js folder. Let’s use gobuster to find the file.


Page 9 / 46


## GOBUSTER

Running gobuster on the js folder in the admin vhost with .js extension.





It straight away finds a file named private.js. Let’s inspect the file. The contents of the file is,


Page 10 / 46


Page 11 / 46


​ ​



It seems to encoded or in some esoteric language. Looking at the top we find a term “ine” which

is the rot13 encoded string for var. So the script is probably rot13 encoded. Copy it to a file to

decode it.


​ ​



​ ​



​ ​



Even after decoding the script is uneasy to read.


[Let’s use an online beautifier​](https://beautifier.io/) to clean the code and look at it. After beautifying the code appears ​
to be obfuscated.


Instead of trying to deobfuscate the code if we look further down we see that it initializes some
variables namely x, z, h, y, t, s, i, k,w.


Page 12 / 46



​ ​



​ ​


We can easily find the values by running the script in a browser and printing the values. Copy the

beautified script and then open up the browser devtools using Ctrl+Shift+I. Then click on the

console tab. Now paste the entire script into the console. Once done add this line and execute it.





We see a message written onto the console.





We find a secret path and parameters action, site, password and session. Let’s check what the
secret path contains.

Browsing directly to the page redirects us back to the login page. So maybe we need to have
access to the admin panel first. As the message doesn’t talk about the page name we’ll have to
fuzz it.


Page 13 / 46


Gobuster can be used again to fuzz the admin page. We’ll use aspx, asp and php extensions as

IIS can support PHP too.





After a while gobuster discovers webadmin.php. Directly hitting the page redirects us again.

Maybe this is due to no session. Let’s inspect it using Burp. We see that it responds with a 302

FOUND and redirects to /.


Page 14 / 46


​ ​



But we have access to some parameters from the message. Let’s use them to see if the response

changes.


​ ​



​ ​



​ ​



Trying the link above we receive a different response “Wrong secret key”. This could mean that

we need the correct password to proceed further.


From the message earlier we know that the password is 8 characters long.

## **FUZZING THE PASSWORD**

Let’s extract all 8 character strings from rockyou to reduce the fuzzing time.


​ ​



​ ​



​ ​



​ ​



[And now fuzz the password using ffuf​](https://github.com/ffuf/ffuf) : ​



​ ​



​ ​



​ ​


Page 15 / 46


The password is found to be 12345678.


Lets try sending the same request with this password.





This time the page responds with two log files. Trying action=show gives an empty response but
maybe it requires the log file to show which could be the session parameter.





Page 16 / 46


Trying the URL above we see that the page responds with credentials we tried on the
HackTheBox phishing page earlier.


As the we have total control over the input we can include arbitrary PHP code and get it

executed. Let’s try that. First login to the HackTheBox phishing page with these credentials:





Looking at the log once again it’s seen that the string “pwned” is echoed.


Now that we have RCE let’s use PHP system() function to execute system commands.


Login with the credentials:





Page 17 / 46


Requesting the logs again we see that the username field is empty, this could mean that
disabled_functions is enforced.


Now that we can execute commands we need to find another way to enumerate the box. PHP

provides some functions to help with this like the scandir() function can be used to list directories,

the file_get_contents() function can be used to read a file and file_put_contents() can be used to

write a file. For example, logging in with these credentials:





And requesting the page, we see the contents of the C: drive.



Page 18 / 46


## **ENUMERATING WITH PHP**

Let’s look at the webadmin script to see if it has some other functionalities. We can use the

file_get_contents function along with base64encode. The credentials are:





After logging in and requesting the page, we receive the script in base64.


Copy the content and decode it locally.





Looking at the script, at the top we see that the session is sha256 hash of the IP address.


Further down we see that the init function clear a session and the exec function is just a dummy.


Page 19 / 46


With all this knowledge we can create a script to implement all the functionality. Here’s an
example:















Page 20 / 46


Page 21 / 46


Page 22 / 46


The script first finds the IP address from the tun0 interface ( change it to your VPN interface ) then

creates a session out of it using sha256. The sendCmd function handles the creation of

credentials with the PHP code. The doReset function is used to reset the log file using the init

action as seen earlier which helps to avoid execution of older code. The fixPath function converts

backslashes to forward slashes to prevent PHP errors.


The Terminal class handles the input of commands where the do_dir command is used to list files

in a directory, do_download downloads a file as seen earlier, it uses the <file> markers for easier

regex search of the file contents and the do_upload function uploads a file by base64 encoding

and copying it to the specified location. The script also supports history and tab autocomplete.


Page 23 / 46


Running the script using python3:


Now we can enumerate the file system using the script. We see a Projects folder and a util folder

in the root directory. We don’t have access to the util folder and projects has just one document.

While enumerating the web folders we see a file web.config.old in the admin folder.


This can be downloaded using the download functionality. For help type:





Page 24 / 46


​ ​



​ ​



The file should be downloaded to the current folder. Looking at the contents of the

web.config.old we credentials for the user simple.


​ ​



​ ​



​ ​


## **ASPX TUNNELING**

Apart from PHP files an IIS server can also execute ASPX and ASP code. We can use ASPX to

deploy a SOCKS proxy through the web server and bypass the firewall. This can be achieved

using [reGeorg​](https://github.com/sensepost/reGeorg) .​ We can use the upload functionality in the script to upload the script. Use the help

menu for instructions. Before that download tunnel.aspx and the python script from the GitHub

repo.



​ ​



​ ​



​ ​


Now upload it using the script, the default upload path is the secret folder on the box.


Page 25 / 46



​ ​


Now browsing to the page, this message should be seen:


Using the reGeorgSocksProxy.py the proxy can activated.


Supply it with the local port number and the URL at which the ASPX page was uploaded to.





Now we can use proxychains in order to send traffic through the socks proxy and scan the box.

Edit /etc/proxychains.conf and add the following line.





Now let’s use nmap again to check the ports we found open earlier from port 6666/





The -sT flag is used to do a full TCP connect scan and -Pn to avoid pinging through the proxy. We


Page 26 / 46


​ ​



find WinRM to be open on port 5985.

## **FOOTHOLD**


As we already have credentials and can connect to WinRM through the proxy, let’s try logging in.

[We can use this​](https://raw.githubusercontent.com/Alamot/code-snippets/master/winrm/winrm_shell_with_upload.rb) script which uses the ruby winrm module. Make the following change to the ​

script:



​ ​



​ ​



​ ​



​ ​


Now using it in combination with proxychains should give us a session.



​ ​



​ ​



​ ​



​ ​


And we have a shell as the user simple. The user is a member of project-managers group and

has SeImpersonatePrivilege enabled which isn’t normal for low level users.


Page 27 / 46


Page 28 / 46


## **LATERAL MOVEMENT** **ENUMERATION**

Which enumerating the folders earlier we found a util folder in the root directory. Let’s see if we

have access to it now.


We do have access to it and there’s a hidden folder named scripts. Let’s check it out.


We have some scripts, log files and a clean.ini file. Let’s look at their permissions.


Page 29 / 46


Looking at the permissions we see that we Modify permissions on backup.bat and clean.ini and

read permissions on batch.log and dellog.bat. There’s another script named dellog.ps1 which we

have no access to. Let’s look at the dellog.bat script.


The script executes dellog.ps1 and appends the output to the batch.log script. Then it runs all the

scripts in the spool folder which we don’t have permissions to view.


Looking at the clean.ini file it looks like some sort of configuration file.


Page 30 / 46


Maybe one of the scripts running in a scheduled task makes use of this configuration file. As we

have Modify access to it let’s injecting commands into the file.

## **COMMAND INJECTION**


Let’s modify the clean.ini to check if we can inject commands. Use the following commands;





Looking at the timestamps on the batch.log file we’ll notice that the script runs every 5 minutes.


After a while when the task runs again we should see the output of whoami /all in the

“C:\ProgramData\w.txt” file while the file “C:\ProgramData\d.txt” is empty. This proves that there’s

a command injection in the LogFile attribute and that the task is running as the user hacker.


Now in order to get a shell we can use nc.exe but we can’t get a reverse shell due to firewall


Page 31 / 46


restrictions. This can be solved by using a bind shell which listens on the host which we can

connect to using proxychains.


First upload nc.exe onto the box using the upload function in the winrm script. We’ll see that we

can’t execute the binary due to AppLocker policy.



This can be easily bypassed by copying the binary into a whitelisted folder in System32 like

“C:\windows\system32\spool\drivers\color\”.





And now trying to run the exe should work.


To create a bind shell the command could be of the form:





Use the following commands to create the clean.ini file:



Page 32 / 46


​


​ ​



​


​ ​



​


​ ​



​


​ ​



And the next time when the script runs we should be able to connect to the port using

proxychains.

## ALTERNATE METHOD USING NAMED PIPES


Earlier we noticed that the user simple has SeImpersonatePrivilege. This can be abused by using

named pipe impersonation. According to the [documentation​](https://docs.microsoft.com/en-us/windows/desktop/ipc/named-pipes) named pipes are used for facilitating

IPC i.e Inter Process Communication. It can support two way communication between a server

and it’s clients.


[Named pipe impersonation​](https://docs.microsoft.com/en-us/windows/desktop/ipc/impersonating-a-named-pipe-client) allows a server to perform operations in the context of the clients. ​


The LogFile attribute in the clean.ini configuration must be used to specify a log to write into. The

user who runs the task could be writing to it. We can switch the LogFile with a named pipe so that

when the user uses it, he connects to our malicious named pipe server.


Page 33 / 46



​


​ ​


​



So let’s create our binary. The source code can be found here:

[https://github.com/MinatoTW/NamedPipeImpersonation/blob/master/NamedPipesCreateFile.c. ​](https://github.com/MinatoTW/NamedPipeImpersonation/blob/master/NamedPipesCreateFile.c)


Here’s a step by step explanation of what the code does:


First enable SeImpersonatePrivilege, this is just a precautionary step. A user should possess the

privilege to be able to enable it.


Then, create a named pipe “haxx” and used the security attributes sa which is set to allow global

access to the pipe. It then waits for connection from clients. Once connected it reads from the

pipe. This is necessary to perform before impersonation.


Next, it tries to Impersonate the client, if successful it creates a file at the desired location using

the CreateFile function and then writes data to it using the WriteFIle function. We can use this to

write a bat file to the spool folder and get it executed.


Page 34 / 46



​



​


First download the file make the following changes at the top:





Now compile the program using mingw. Make sure mingw-64 is installed.





Now upload the exe using the PHP RCE script from earlier.





Now inject the named pipe path into the LogFile attribute.





Page 35 / 46


Once this is done, execute the binary and wait for the task to run again:





When the task runs and the pipe is accessed the exploit should be written into the spool folder

and the bat file will get executed. We can then connect to it using proxychains.


Page 36 / 46


## **PRIVILEGE ESCALATION** **ENUMERATION**

During the initial enumeration we discovered a service named UserLogger running as SYSTEM.

Let’s look at the details of the service.





However, we get minimal information, like the service is stopped and start type is manual.


Let’s query it using the sc command instead.





Page 37 / 46


​



We see the service binary path is C:\Windows\System32\UserLogger.exe. Let’s see if we have

permission to start/stop the service.


​



​



​



​



We can see the permissions using the sdshow command which is displayed in SDDL (Security

[Descriptor Definition Language). Let’s break it down following ​this. The first ACL ending with SY​](https://docs.microsoft.com/en-us/windows/desktop/SecAuthZ/ace-strings)

is for the SYSTEM account. The next ACL is ending with the SID of hacker user. The ACE attribute

“A::” at the beginning stands for “Allowed” which means that we have permission to start / stop

the service.


Having confirmed this, let’s download and analyze the binary. To download it, first copy the

binary to a readable folder like C:\ProgramData and then download it using the RCE script.



​



​



​


Note: Make sure you’re on a 64 process, if not use a 64 bit netcat to spawn a shell, as a 32 bit

shell can cause problems later.


Now download it using the python RCE script from earlier.



​



​



​



​


Page 38 / 46


​ ​



​ ​


## **ANALYSING THE BINARY**

Let’s see what the binary is doing under the hood with dynamic analysis. Copy the binary to a

Windows VM, and make sure you’re an Administrator. Now create a service just as on the box.


​ ​



​ ​



​ ​



​ ​



Now download Process Monitor from the SysInternals suite. You can find it [here​](https://docs.microsoft.com/en-us/sysinternals/downloads/procmon) .​ This will help us

to see what all the binary is doing while the service starts and runs.


Page 39 / 46


Extract the contents and start Process Monitor. Click on the Filter drop down at the top and select

Filter. Set the filter to match the Image Path to the userlogger.exe.


And then click on “Add” to save the filter and press Ctrl + X to clear. Once done go back to the

CMD prompt and start the service.





Now going back to Process Monitor and looking at the events we find some CreateFile and

WriteFIle operations.


The binary creates a file at C:\Windows\Temp\UserLoggerService.log and then continuously

accesses it to read and write. Let’s see what the file contents are:


Page 40 / 46


It says the no logfile was specified and that it is using the default which must be the current file.

Then it logs the service status while starting and running. Let’s try specifying a logfile as a

command line option to see if the events change. Clear the Process Monitor console again.





We see the CreateFile event once again and this time the file create a log file at

C:\Users\Administrator\log.log. And it’s contents are:


This time it says that the Logfile was specified. So from this dynamic analysis we came to know

two things:

  - The service can take a parameter as a logfile path

  - It appends .log to the filename and uses it as a logfile.

Let’s test this behaviour on the box. Go back to the hacker shell and start the service with a

logfile specified.


Page 41 / 46


This confirms that the service exhibits the same behaviour on the box as we analysed earlier.


Note: In case the log file isn’t created it means that the shell is a 32 bit process, get a shell using

64 bit netcat then.

Now let’s see if we can write to sensitive locations like System32.





Page 42 / 46


​ ​



​ ​



​ ​



​ ​



This confirms that we can write to System32, and icacls shows that we have permissions to

overwrite the created file.


Now that we have the ability to perform arbitrary writes, we should be able to exploit it using the

DiagHub collector POC by James Forshaw. A detailed explanation can be found here 
[https://googleprojectzero.blogspot.com/2018/04/windows-exploitation-tricks-exploiting.html](https://googleprojectzero.blogspot.com/2018/04/windows-exploitation-tricks-exploiting.html)

## **GETTING A SHELL**


Download the simplified version of the POC from [here​](https://github.com/decoder-it/diaghub_exploit) .​ Open up the solution in Visual Studio.

Before compiling it we need to change a couple of things. First, in the diaghub_exploit.cpp

change the valid_dir to some writable location like C:\ProgramData.


Page 43 / 46



​ ​


Once that’s done, navigate to FakeDll.cpp and change the cmdline string to some file we can

control.


Now build the solution and copy the binary as well as the DLL to local box. Then upload it using

WinRM script or using the PHP RCE script.





Now from a hacker shell create the bat script which will trigger our shell:





Page 44 / 46


Then start the userlogger service creating a log file in System32 then copy the DLL over it.





And then execute the binary with pwn.log as the argument.


And on the other side we have a SYSTEM shell!



Page 45 / 46


Going into the Administrator’s Desktop we see that the file isn’t an MD5 hash.


However, if we check of the NTFS ADS ( Alternate Data Streams ) we see that flag.txt exists.





The flag can be viewed by using:





Page 46 / 46


