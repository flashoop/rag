# Sniper

*Converted from: Sniper.pdf*

---

# Sniper

24 [th] March 2020 / Document No D20.100.62


Prepared By: TRX


Machine Author: MinatoTW


Difficulty: Medium


Classification: Official


## **Synopsis**

Sniper is a medium difficulty Windows machine which features a PHP server. The server hosts a

file that is found vulnerable to local and remote file inclusion. Command execution is gained on

the server in the context of NT AUTHORITY\iUSR via local inclusion of maliciously crafted PHP

Session files. Exposed database credentials are used to gain access as the user Chris, who has

the same password. Enumeration reveals that the administrator is reviewing CHM (Compiled

HTML Help) files, which can be used the leak the administrators NetNTLM-v2 hash. This can be

captured, cracked and used to get a reverse shell as administrator using a PowerShell credential

object.
### **Skills Required**


Enumeration
### **Skills Learned**


LFI and RFI

PHP Session File Abuse

Malicious CHM Creation

NetNTLM-v2 Hash Capture and Cracking


## **Enumeration**



The scan reveals that this is a Windows system which is running an IIS web server. Let's check out

the website in our browser.


The website belongs to the company **Sniper Co** . Items of interest are a [login page](http://10.10.10.151/user/) and company

blog. The [blog](http://10.10.10.151/blog) contains information about the website.


## **Foothold**

### **Local File Inclusion**

After navigating to the blog page and changing the language, we see the following URL.





Since the page uses a GET parameter to load a page it would be a good idea to test for a Local

File Inclusion. Usually we can use ../ to load files from different directories. In windows the

default web directory is C:\inetpub\wwwroot . As we are in the blog subdirectory the path

would be C:\inetpub\wwwroot\blog\ . In order to traverse up three directories and load the

Windows Initialization file from C:\Windows\win.ini we can input the following.





However, this is unsuccessful. Instead, let's try again, specifying the absolute path.





Using Curl to load the above web page, we can view the ini file at the bottom of the page.




#### **Session Cookie**

We need to find a way to upgrade from LFI to RCE. After searching, we come across [this](https://www.rcesecurity.com/2017/08/from-lfi-to-rce-via-php-sessions/) blog

post. Let's see what the user session file contains. First of all we will have to register as a new

user, for instance Email: test@test.test / Username: guest / Password: guest and login.


The login was successful and we are presented with the following page.


We now need to find our session cookie value which is a unique identifier that PHP uses to

differentiate between users. This can be done by right clicking on the web page, clicking Inspect

Element, navigating to Storage and copying the **PHPSESSID** value.


PHP stores the session files in C:\Windows\TEMP in the format sess_<cookie> . In order to read

our session file we will use the session ID we acquired. In this case the session file would be

sess_923nktm0vmmi12qrptls332t5o . Let's see if we can read it.

**Note** : Replace everything after sess_ with your own cookie value.


In the source code we see that the session file stores our username and its length. Since we

logged in as guest, PHP created a session file and binded that session with the username

guest . This is done so that after a refresh, PHP knows if you have logged in or not.

#### **Remote Code Execution**


If we can create a username containing PHP code, we could potentially gain RCE. Consider the

following as a username.





The symbol **`** is an alias for PHP's exec, therefore anything inside **`** will be executed.


Let's register a new user with the above code as a username, and log back in. The session file

should be overwritten with the new username. We can use Curl to load the web page.





In the source code we see IUSR as the username which is the default user for IIS (when

impersonation is enabled).


#### **Blacklisting**

Attempting to create a username with specific characters such as $ is unsuccessful, which

indicates the presence of a blacklist. In order to figure out which characters are forbidden, we can

create a Python script which creates credentials with each symbol and then attempts to log in. If

the login is denied then that means that the character is forbidden. Let's script this.



Running the script with python3 check.py returns the following.

This identified that the characters "$&'(-.;[_ are blacklisted. We can use Base64 encoding to

bypass the blacklist. Let's encode the whoami command.




As the default locale for Windows is UTF-16LE, we use iconv to convert to that locale before

Base64 encoding. The final payload would be:




#### **Shell**

In order to gain a reverse shell we can upload Netcat to a writable folder. Place nc.exe in

/var/www/html on your local machine and start Apache.



Lets separate the payload into two commands, one to download Netcat onto the system and the

second to execute it. First, issue the following command.





The first payload becomes:







After creating a new user with the above payload, and using the LFI to trigger execution of the

session cookie, our Netcat binary is uploaded to the server. Next, create the second payload.





The second payload becomes:







Create a user with the above payload and start Netcat listener.





After logging in again and navigating to the session cookie, we will receive a shell.


### **Remote File Inclusion**

We can also get a shell by using Remote file Inclusion and SMB. Let's create an SMB share on our

system and place a Web Shell inside. Then we will access the web shell from the Server. Let's

begin by opening the Linux file manager, navigating to our home directory, right clicking the

Public folder, clicking on Sharing Settings and clicking on Share this folder .

Then let's create the file shell.php with the following contents.





Navigate to the following URL.





The variable 0 is used to specify the command to be executed. The above payload will execute a

directory listing on the server.


## **Lateral Movement**

Since the website provided a login functionality a good first step would be to check for any

database credentials. Navigating to C:\inetpub\wwwroot\user\ we see the file db.php, which

contains the MySQL database password: 36mEAhz/B8xQ~2VM .





The **net users** command reveals a user called chris . There's a chance that the password for the

database has been re-used as his password. We can create a PowerShell credential Object and

check this.





The command output is successful. We can get a shell as Chris by uploading Netcat in his home

folder and executing it. Let's start a Netcat listener.





Then let's execute it as Chris.







This is successful, and we receive a shell as Chris.


The user flag can be located in C:\Users\chris\Desktop


## **Privilege Escalation**

Navigating to C:\Docs\ we can find a note with the following content.



In C:\Users\chris\Downloads we find instructions ~~.~~ chm . A CHM file is a compiled HTML file

that is used for "Help Documentation". Therefore, the administrator might be expecting the CHM

file to be in placed in C:\Docs\ .


In order to exploit this, we can create a new CHM file containing a UNC link, that will trigger a

connection to our server on opening. This will allow us to steal the admins NetNTLMv2 hashes.

Consider the following HTML code.







We will place the above code into instructions.html, and use the [HTML Help Workshop](https://www.microsoft.com/en-us/download/confirmation.aspx?id=21138) on a

Windows machine to compile the code. Download and install htmlhelp.exe . Next, open HTML

Help Workshop from the Start Menu and click on File -> New -> Project .


We will then be asked the folder in which the project will be saved. We can use the Desktop.


In the next window we will need to click the box to Include HTML files.

Finally we select the file Instructions.html we created earlier.


Let's proceed to compile our HTML file. Click on the compile button in the tool bar.


We click compile when prompted. After waiting for a while our CHM file will be created in the

same folder.


Copy instructions.chm back to our Linux machine, copy it to /var/www/html and download it

from the server.





Open Responder on our local machine.





Next, let's copy instructions.chm into C:\Docs .





After a few seconds we will receive the Administrators hash in Responder.


Let's place it inside hash.txt and use hashcat to crack it.





After a few seconds, it cracks and we see the password **butterfly!#1** . We can use Invoke
Command to receive a shell as the local administrator.


Start a new Netcat listener and execute the following commands.


We receive a shell as administrator, and can access the root flag on the desktop.


