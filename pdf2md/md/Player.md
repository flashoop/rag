# Player

*Converted from: Player.pdf*

---

# Player
## **5 [th] November 2019 / Document No D19.100.46**

**Prepared By: MinatoTW**

**Machine Author: MrR3boot**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 25


## **SYNOPSIS**

Player is a Hard difficulty Linux box featuring multiple vhosts and a vulnerable SSH server.

Sensitive information gained from a chat can be leveraged to find source code. This is used to

gain access to an internal application vulnerable to LFI through FFMPEG, leading to credential

disclosure. The vulnerable SSH server is exploited to login to a Codiad instance, which can be

used to gain a foothold. Process enumeration reveals a cron job which executes a script that is

vulnerable to PHP deserialization. The script is exploited to write files and gain a shell as root.


## **Skills Required**


  - Enumeration

  - PHP serialization


## **Skills Learned**


  - Vhost enumeration

  - Creating JWT Cookies

  - LFI through FFMPEG



Page 2 / 25


## **Enumeration** **Nmap**





We see SSH and Apache services running on their common ports. Additionally, there’s an SSH

server running on port 6686.


Page 3 / 25


## **Apache**

Browsing to port 80, we receive a 403 forbidden message.


We see the same response even after adding the player.htb vhost to /etc/hosts.

## Gobuster


We can run gobuster against the web server, using 100 threads.


It finds a folder named launcher. Navigating to the folder in the browser we find a page titled

“PlayBuff”.


Page 4 / 25


After entering an email and intercepting in Burp, we see it sending a request to a PHP page with

a cookie named “access”.


The cookie is in a standard JWT format with three parts. Let’s decode the second part to view the

values.


Page 5 / 25


It contains the attributes “project” and “access_code”. In order to create our own cookie, we’ll

need the secret key which is used to sign it.

## Vhost enumeration


Wfuzz can be used to enumerate vhosts. The Host header can be used to fuzz vhosts using a

wordlist. The --sc flag is used to display results which return 200.


Wfuzz found two vhosts i.e “chat” and “dev”. Add these to the hosts file and proceed to view

them in the browser. The dev vhost contains a login page, and examination of the JS files reveals

a Copyright notice.


Page 6 / 25


​ ​


​ ​



​ ​


​ ​



According to this, the server is running Codiad.


The GitHub repo for the project can be found [here​](https://github.com/Codiad/Codiad) .​ Looking at the README file, we see that it’s

not updated anymore.


[An exploitation PoC can be found here​](https://github.com/WangYihang/Codiad-Remote-Code-Execute-Exploit) . However, as it is an authenticated RCE, we’ll have to find ​

credentials first.


Looking at the chat.player.htb vhost we see a message.


Page 7 / 25



​ ​


​ ​



​ ​


​ ​


According to this, “staging” is exposing sensitive files and the main domain is exposing source

code. Maybe, staging is another vhost? Let’s add it to the hosts file and take a look.


It contains some static pages along with a contact page.


After entering details and submitting, we’re redirected to a page with an error. Intercepting the

request in Burp, we see the following message:


Page 8 / 25


We see two file names referenced, i.e. /var/www/backup/service_config and

/var/www/staging/fix.php. Let’s save these for later.


The message also mentioned source code leakage on the main vhost. It is possible that manual

file backups are created, or as files are edited, temporary or backup files may also be created.

This is a risk if they are edited in place in the web root, as these files can be discovered and

downloaded. Example extensions are .bak, .phps, or a ‘~’ at the start or end of the filename. After

trying this on the PHP files from the main vhost, the source code for one file is returned.


Here are the contents of the dee8dc8a47256c64630d803a4c40786c.php file.





Page 9 / 25


​ ​



We can see the secret key along with the access code required to create a valid JWT cookie. If

the cookie is properly signed, then we get redirected to a hidden location or else index.html.


We can create our own JWT cookies using [this​](https://jwt.io/) website. We already know that the signing ​

algorithm is HS256. First, set the payload data to a valid access code.


Next, copy the key into the input box and select “base64 encoded secret”.


This will automatically create the valid cookie on the left-hand side. It can be swapped with the

invalid cookie in the browser’s storage tab.


Sending the email request once again should redirect us to the upload page.


Page 10 / 25



​ ​



​ ​



​ ​


​ ​



​ ​



​ ​


Clicking on the link returns a 404 Not Found error.


Looking at the extension “avi” we can assume that the page is compressing video files. Let’s try

uploading a valid avi file which can be found [here​](http://www.engr.colostate.edu/me/facil/dynamics/avis.htm) .​ After uploading and clicking on the link, the

page should return a video.


Page 11 / 25



​ ​


​ ​ ​

​ ​

​ ​



​ ​ ​

​ ​

​ ​


## **LFI through FFMPEG exploitation**

Running exiftool on the downloaded file, we see that the Video codec is FMP4. Searching about

​ ​ ​

​ ​

​ ​



it we find that FMP4 stands for **F** ​ FMpeg **MP** ​ EG- **4** ​ and is used by FFMPEG. An LFI vulnerability

​ ​

​ ​



​ ​ ​

[exists in FFMPEG​](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Upload%20Insecure%20Files/CVE%20Ffmpeg%20HLS),​ which can be used to read arbitrary files after conversion. The exploit script

​ ​



​ ​ ​

​ ​

can be downloaded from [here​](https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/Upload%20Insecure%20Files/CVE%20Ffmpeg%20HLS/gen_xbin_avi.py) .​ Lets try reading the contents of /etc/passwd.



​ ​ ​

​ ​

​ ​



​ ​ ​

​ ​

​ ​


Upload this malicious AVI to the website and download the converted video. Playing the video


Page 12 / 25



​ ​ ​

​ ​

​ ​


​



Having confirmed the LFI, we can turn our attention to reading sensitive files. Recalling the

information leak on the staging server, the file names **/var/www/backup/service_config** ​ and

**/var/www/staging/fix.php** were exposed. Let’s try reading these using the LFI.


We generate two files and upload them. The service_config file returns credentials for the user


have the permissions to read it. Let’s logging in through SSH with the credentials

**telegen / d-bC|jC!2uepS/w.**


Page 13 / 25



​



​


## **Foothold**

The login fails on port 22, but is successful on the other SSH server running on the box.


However, the SHELL assigned to us is a restrictive lshell. Looking at the available commands we

see these.


These won’t help us to escape the restricted shell. Let’s take a step back, and examine the SSH

server versions reported by nmap. Port 22 is running OpenSSH version 6.6.1p1 while port 6686 is

[running version 7.2. Searching for vulnerabilities in these we come across an ​authenticated](https://www.exploit-db.com/exploits/39569)

[command injection](https://www.exploit-db.com/exploits/39569) in version 7.2. As we already have user credentials, we can try using the

script to check if the server is vulnerable.


Page 14 / 25


The script worked, and we are able to read the passwd file.



Page 15 / 25


​


## **Lateral Movement**

Let’s try reading the fix.php file, which wasn’t possible using the file upload vulnerability.


The file does exist and we can see credentials for “peter” commented out in the script. We can’t

SSH in with these credentials, as this user doesn’t exist on the system.


Let’s try logging into the “dev” vhost with the credentials **peter / CQXpm\z)G5D#%S$y=** ​ .


Page 16 / 25



​


​ ​



​ ​



The login was successful and we have gained access to the IDE. Let’s try using the Codiad

[exploit we found earlier. The script can be downloaded from here​](https://github.com/WangYihang/Codiad-Remote-Code-Execute-Exploit/blob/master/exploit.py) .​


After executing the commands specified by the listener we should receive a shell.


Page 17 / 25



​ ​



​ ​


​ ​


## **Privilege Escalation**

We can now spawn a TTY shell and try to switch to telegen using the su command.


[We were able to switch but land in the restricted shell once again. Looking at the man page​](http://man7.org/linux/man-pages/man1/su.1.html) of ​

the su command, we come across the -s option.


It can be used to specify the shell to execute instead of the default shell assigned to the user.

Let’s specify /bin/bash in our command.


Page 18 / 25



​ ​



​ ​


​ ​



​ ​



This time we were able to switch successfully and bypass the restricted shell . Let’s enumerate

the running processes and cron jobs using [pspy​](https://github.com/DominicBreuker/pspy) .​


Transfer it to the box and execute it. Among other events, we see this:



​ ​



​ ​



​ ​



​ ​


The cron executes the command “php /var/lib/playbuff/buff.php > /var/lib/playbuff/error.log” as

root.


Page 19 / 25


We see four files in the folder and telegen owns the merge.log file. Let’s look at the buff.php file.





Page 20 / 25


​ ​



​ ​



​ ​



The script creates an object of the class playBuff and then serializes it and stores the result in a

variable. Then the contents of the file merge.log are read into $data. The unserialize method is

called with $data as the argument. According to the PHP [documentation​](https://www.php.net/manual/en/function.unserialize.php), the unserialized ​

method takes in a serialized string as input and attempts to call __wakeup( ) function.


Going back to the script, the __wakeup() method is defined as follows.



​ ​



​ ​



​ ​



​ ​


Page 21 / 25


It uses file_put_contents to write “Update” to logs.txt in the same directory (denoted by __DIR__).

This means that if we can alter $logFile and $logData variables, we can write to any file as root.

As the logFile is prefixed with /var/log/playbuff we can append “../../” to it traverse folders.


The following PHP script can be used to create a serialized object.





The payload will write “pwned” to the file at /tmp/proof. Execute the script and redirect the output

to merge.log.


Next, download this file to the current folder so that it can be read by root.


Page 22 / 25


The file should be created after a while with the expected contents.


Similarly, we can write our public key using the same method. Change the variable $logData to

contain a public SSH key, and $logFIle to authorized_keys, and then follow the same process.





We are now able to login as root.



Page 23 / 25


​ ​



​ ​


## **Alternate Method**

At the beginning of the script we see that it includes an external file.


​ ​



​ ​



​ ​



This file owned and writable by www-data.


This file can be modified as www-data to execute a shell on inclusion. A PHP reverse shell can be

[found here​](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php) . Download the script and modify the IP address and rename it to ​

dee8dc8a47256c64630d803a4c40786g.php.


Switch to the www-data shell and download this script to the launcher folder.


Page 24 / 25



​ ​



​ ​


The next time script is executed, we should receive a shell as root.



Page 25 / 25


