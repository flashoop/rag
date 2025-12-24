# OpenAdmin

*Converted from: OpenAdmin.pdf*

---

# OpenAdmin

16 [th] April 2020 / Document No D20.100.69


Prepared By: MrR3boot


Machine Author(s): dmw0ng


Difficulty: Easy


Classification: Official


## **Synopsis**

OpenAdmin is an easy difficulty Linux machine that features an outdated OpenNetAdmin CMS

instance. The CMS is exploited to gain a foothold, and subsequent enumeration reveals database

credentials. These credentials are reused to move laterally to a low privileged user. This user is

found to have access to a restricted internal application. Examination of this application reveals

credentials that are used to move laterally to a second user. A sudo misconfiguration is then

exploited to gain a root shell.
### **Skills Required**


Enumeration

Port Forwarding

Code Review
### **Skills Learned**


Web Exploitation

Password Cracking

Nano Sudo Exploitation


## **Enumeration**

### **Nmap**

f



f



f



f



The Nmap scan reveals SSH and Apache to be running on their usual ports.
### **Apache**


Browsing to port 80, the default Apache page is seen.

#### **FFUF**


Let's enumerate files and folders on the server using [ffuf.](https://github.com/ffuf/ffuf)



f



f


We discovered a few folders named music, artwork and sierra . The python script below can

be used to scrape the navigation links from the pages present in results.txt .


The script retrieves the files and folders from the provided list, and uses the BeautilfulSoup

library to look for and extract the href attribute in anchor tags, which are then printed out.





Running it yields the results below.

Apart from the .html files, a path ../ona is found.

#### **Dirbuster**


Alternately, running dirbuster returns the ona page as well.


## **Foothold**

Browsing to the /ona directory shows that this is an older version of the application.


The download hyperlink contains a reference to the OpenNetAdmin website. Searching exploit
db for exploits related to OpenNetAdmin v18.1.1 reveals a [Remote Code Execution](https://www.exploit-db.com/exploits/47691) vulnerability.

#### **Remote Command Execution**

OpenNetAdmin suffers from a command injection vulnerability through the xajaxargs[]

parameter. This vulnerability can be exploited using the referenced script.









The exploitation is successful and we have gained a foothold.

#### **Alternate foothold via LFI**


This OpenNetAdmin version also suffers from a [Local File Inclusion](https://www.exploit-db.com/exploits/26682) (LFI) vulnerability. This flaw

allows an attacker to traverse outside of the restricted path and include arbitrary files on the

server, resulting in command execution.

Sending the request below creates a new module named test, containing a PHP web shell.

This module can be included from the /ona/dcm.php?modules=test page.

We can now execute system commands through the 1 GET parameter.



Save the reverse shell payload below to index.html inside /var/www/html folder, and ensure

the Apache server is running locally.





The shell can be executed on the server by using the payload below, which pipes cURL output to

/bin/sh .


## **Lateral Movement**

We can spawn a PTY to get a fully functioning shell.





Checking entries in /etc/passwd shows that there are two system users.


We can further enumerate the box using scripts such as [LinEnum.sh](https://github.com/rebootuser/LinEnum) or [linPEAS.sh. Download the](https://github.com/carlospolop/privilege-escalation-awesome-scripts-suite/tree/master/linPEAS)

script and copy it the Apache web root. Next, use curl to transfer and execute the script.





This runs but doesn't provide any interesting information. Manually enumerating the web root

reveals a folder named internal, that can only be accessed by jimmy .


The OpenNetAdmin [forum](https://opennetadmin.com/forum_archive/4/t-85.html) post shows that the database configuration details are stored in the

file ona/local/config/database_settings.inc.php .

Database credentials are found, and reusing this password for jimmy gives us SSH access.

We can now access the /var/www/internal directory as jimmy .


Looking at the /etc/apache2/sites-enabled/internal.conf configuration file reveals that the

internal virtual host is running as joanna on localhost port 52846 .


Inspection of index.php shows a login page, hard-coded with a hashed password.


We can see that this was hashed using the SHA512 algorithm, which can be cracked using John

the Ripper.


Alternately, the [CrackStation](https://crackstation.net/) website can also be used to crack the hash.


The application can be accessed remotely through SSH port forwarding.


The command above creates a remote SSH tunnel, which forwards all connections from port

1337 on our host to port 52946 on the box. Make sure that the SSH server is running and

permits root login. The application can now be accessed by browsing to


Let's login to the application using the credentials jimmy / Revealed .


The main.php page displays an encrypted SSH key.
### **Alternate Method**

Inspecting the main.php source code reveals that it continues to read the SSH key, instead of

terminating the connection.


This means that we can access the page unauthenticated, and the server should return the key

before redirection.


A hash is generated using ssh2john.py .





The password is revealed as bloodninjas, which can be used to login as joanna .


### **Alternate method #2**

Code execution as joanna can also be achieved by writing a PHP shell to the

/var/www/internal folder.


## **Privilege Escalation**

Running LinPEAS again shows that joanna is allowed to run nano as root.


This can be used to gain root access on the server.





Nano allows inserting external files into the current one using the shortcut Ctrl + R .

The command reveals that we can execute system commands using ^X . Press Ctrl + X and

enter the following command to spawn a shell.




