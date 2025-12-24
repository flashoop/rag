# Irked

*Converted from: Irked.pdf*

---

# Irked
## **21 [st] April 2019 / Document No D19.100.15**

**Prepared By: MinatoTW**

**Machine Author: MrAgent**

**Difficulty: Easy**

**Classification: Official**


## **SYNOPSIS**

Irked is a pretty simple and straight-forward box which requires basic enumeration skills. It shows

the need to scan all ports on machines and to investigate any out of the place binaries found

while enumerating a system.


## **Skills Required**


  - None


## **Skills Learned**


  - Exploit modification

  - Troubleshooting Metasploit modules

  - Linux Enumeration


Page 2 / 11


## **ENUMERATION** **NMAP**

The results of a version and script scan on all open ports.




## **QUERYING RPC**





Page 3 / 11


## **APACHE - PORT 80**

A message “IRC is almost working” is displayed which confirms nmap finding.

## **UNREAL IRCD**


Finding the version of Unreal IRCD running on the box.





The version returned by the server is “Unreal 3.2.8.1” .



Page 4 / 11


​ ​



A quick google search about the version yields [exploit-db​](https://www.exploit-db.com/exploits/13853) and [metasploit​](https://www.rapid7.com/db/modules/exploit/unix/irc/unreal_ircd_3281_backdoor) resources. According to

the description there was a backdoor added to Unreal IRCD version 3.2.8.1 which allows

execution of commands prefixed with AB; .


Page 5 / 11


## **FOOTHOLD** **METASPLOIT MODULE**

Metasploit framework has the module “unreal_ircd_3281_backdoor” which can be used. Lets

start it up and run the module.


The module results in a shell right away. The same can be done manually using netcat. We echo

in the backdoor command when a connection is established to get it executed.





Page 6 / 11


The server replies back with pings which means the payload got executed.

## SPAWNING A SHELL


The same procedure can be repeated with a bash reverse shell command which returns a shell.





Spawn a tty shell using python or python3.





Page 7 / 11


## **LATERAL MOVEMENT** **ENUMERATING DJMARDOV’S FOLDER**

On navigating to the second user’s folder on the box i.e ~djamrov a file named .backup is found

in the Documents folder.





It says “Steg backup” which points towards steganography. The only found so far is the one on

the web page on port 80.


Download it and extract its contents using steghide and the password found in the backup file.





Which gives pass.txt containing a password which can be used to ssh in as djmardov.



Page 8 / 11


## **PRIVILEGE ESCALATION** **ENUMERATING SUID BINARIES**

On listing the suid files a file /usr/bin/viewuser is noticed which isn’t present on Debian by default.





Page 9 / 11


Note: The nrcy step can be directly performed from a shell as ircd too.

## EXPLOITING VIEWUSER BINARY


The binary viewuser is a 32 bit binary executable.


On executing it, the binary errors out at the end as /tmp/listusers isn’t found.


By running ltrace on the binary we can verify it’s actions. First transfer the binary to local machine.







On executing ltrace on the binary it’s seen that it first calls setuid() to the uid to 0 and then calls
system to execute /tmp/listusers.


Page 10 / 11


This can be exploited by creating a file /tmp/listusers with a malicious code which will get
executed by root when it is called by the viewuser binary.





Page 11 / 11


