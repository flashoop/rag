# Traverxec

*Converted from: Traverxec.pdf*

---

# Traverxec

5 [th] April 2020 / Document No D20.100.63


Prepared By: TRX


Machine Author: jkr


Difficulty: Easy


Classification: Official


## **Synopsis**

Traverxec is an easy Linux machine that features a Nostromo Web Server, which is vulnerable to

Remote Code Execution (RCE). The Web server configuration files lead us to SSH credentials,

which allow us to move laterally to the user david . A bash script in the user's home directory

reveals that the user can execute journalctl as root. This is exploited to spawn a root shell.
### **Skills Required**


Enumeration

Metasploit

Password Cracking
### **Skills Learned**


SSH Key Cracking

GTFOBins


## **Enumeration**

Let's begin by running an Nmap scan.



The scan reveals ports 22 and 80 to be open. Nmap reports the http-server-header to be

nostromo 1.9.6, which means that the box is running the Nostromo HTTP server.
### **Nostromo**


Nostromo or nhttpd is an open source web server.


The webpage does not seem to show anything interesting, and a Gobuster scan failed to find

anything useful.


## **Foothold**

### **Manual Exploitation**

A bit of research yields that nostromo version 1.9.6 has a [Remote Code Execution](https://www.exploit-db.com/exploits/47837) vulnerability.

Let's download the python exploit and execute it as follows.





In order to get a reverse shell we can use Netcat. Let's start a Netcat listener on our local

machine.





Then execute the following command to get a shell.




### **Metasploit**

We can also exploit the vulnerability using the [Metasploit](https://www.rapid7.com/db/modules/exploit/multi/http/nostromo_code_exec) module. Let's start Metasploit and try to

exploit it.



The lhost and rhost values are set as required and the module is run.


The exploitation was successful and a shell is returned.
### **TTY**

Next, a TTY shell can be spawned using python .




## **Lateral Movement**

Let's enumerate the system to find privilege escalation vectors. The /etc/passwd file reveals a

user named david . It also reveals that the Nostromo web root is /var/nostromo/ . The folder

/var/nostromo/conf contains the web server configuration files.

The file nhttpd.conf and .htpasswd seem interesting. The .htpasswd contains a password

hash, which is crackable, but it turns out to be of no use.


The nhttpd.conf file contains the following configuration.

The HOMEDIRS section determines that there might be a public_www folder in the user's home

directory. The home directory of the user is not readable, however public_www is found to be

accessible. The folder contains a protected-file-area sub-folder.



Enumeration of the folder reveals some backed up SSH keys. Let's transfer them to our box using

netcat. Run the following command locally to receive the file.





Next, run the following command on the server to complete the transfer.




Let's extract the files inside backup-ssh-identity-files.tgz .





The archive is found to contain SSH keys out of which, the private key id_rsa can be potentially

be used to login as david .



However, the private key is encrypted and needs a password. Let's use john to try and crack it.

First, extract the hash from the RSA key using ssh2john .





Next, crack it using john and the rockyou.txt wordlist.





This reveals the password to be hunter, which we use to SSH into the machine.





The user flag is located in /home/david/ .


## **Privilege Escalation**

The user's home directory contains a folder called bin with the following contents.





The last line is interesting as it executes journalctl using sudo. Let's run the script to see the

output.





The script returns the last 5 lines of the nostromo service logs using journalctl. This is exploitable

because journalctl invokes the default pager, which is likely to be [less . The](https://gtfobins.github.io/gtfobins/less/) less command

displays output on the user's screen and waits for user input once the content is displayed. This

can be exploited by running a shell command.





The command above will invoke less, after which we can run shell commands by prefixing ! .

Let's try executing /bin/bash .




The execution was successful and root shell is spawned. The root flag is located in /root/ .


