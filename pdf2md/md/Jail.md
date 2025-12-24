# Jail
## **31 [st] October 2017 / Document No D17.100.36**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: n0decaf**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 13


## **SYNOPSIS**

Jail, like the name implies, involves escaping multiple sandbox environments and escalating

between multiple user accounts. It is definitely one of the more challenging machines on Hack

The Box and requires fairly advanced knowledge in several areas to complete.


## **Skills Required**


  - Advanced knowledge of Linux

  - Basic understanding of buffer

overflows


## **Skills Learned**


  - Enumerating NFS shares

  - Exploiting buffer overflows

  - Escaping SELinux sandbox

  - Exploiting NOPASSWD

  - Escaping rvim

  - Generating targeted wordlists

  - Cracking encrypted RAR archives

  - Exploiting weak RSA public keys


Page 2 / 13


## **Enumeration** **Nmap**

Nmap reveals several open services, most of which will end up being used during exploitation.

To start, Apache and an unknown service on port 7411 are the most important.


Page 3 / 13


​


## **Dirbuster**

Dirbuster reveals a **/jailuser** ​ directory, which contains source code and a binary compiled from

the given source. This binary is running as a service on port 7411.


Page 4 / 13



​


​


## **NFSShare**

Enumerating the NFS share with **nmap -sV --script=nfs-ls 10.10.10.34** ​ reveals a volume at

**/var/nfsshare**


Page 5 / 13



​


​


​


## **Exploitation** **Buffer Overflow**

After reviewing the source code, the username **admin** ​ is found, as well as the ability to enable

debug mode to get the password offset through the remote service. With the source code in

hand, it is fairly straightforward to create a functional exploit. Refer to **jail_bof.py (Appendix A)** ​ to

see an example using pwntools.


Page 6 / 13



​


​


​

​


​

​


## **Privilege Escalation** **SELinux Sandbox (frank)**

Exploit: [http://seclists.org/oss-sec/2016/q3/606​](http://seclists.org/oss-sec/2016/q3/606)


[NFSShell: https://github.com/NetDirect/nfsshell​](https://github.com/NetDirect/nfsshell)


Escaping the sandbox can be quite tricky for many users that do not have experience with

sandboxed environments. Using NFSShell to connect to the share with the commands **host** ​

**10.10.10.34** and **mount /var/nfsshare** ​ allows for uploading and minor file modifications.


After modifying the above exploit to copy an SSH key from the share to

**/home/frank/.ssh/authorized_keys**, it is possible to place the exploit binary and an SSH key on

the target. Using the pwntools session, it is possible to execute the exploit with

**/var/nfsshare/writeup**, and then directly SSH in using the generated private key.


Page 7 / 13



​

​


​

​


​

​ ​


## **rvim (adm)**

Running VIM commands: [https://www.linux.com/learn/vim-tips-working-external-commands​](https://www.linux.com/learn/vim-tips-working-external-commands)


Running **sudo -l** ​ reveals NOPASSWD is set when running rvim on the **jail.c** ​ file in the web

directory. It is trivial to escape rvim by spawning a bash shell through a Python command.


**sudo -u adm /usr/bin/rvim /var/www/html/jailuser/dev/jail.c**


**:python import pty; pty.spawn(“/bin/bash”);**


Page 8 / 13



​

​ ​


​


​ ​

​


​


​


## **Root**

A bit of searching reveals **/var/adm/.keys** ​ which contains an encrypted rar file and a note which

hints to the format of the rar password. It is possible to generate a wordlist from the hints with the

command. This part can be tricky, but it can be assumed the 4 digit number will most likely be a

birth year and the last name may start with an uppercase. Writing a short Python script and using

a small surname wordlist as input, it is possible to generate a valid list to use with john. Refer to

**wordlistgen_jail.py (Appendix B)** for a basic example.


​ ​

​


​


​



​


Using the commands **rar2john keys.rar > keys.hash** ​ and **john keys.hash --wordlist=wordlist.txt** ​

​


​


​



​


​ ​

will successfully crack the hash ( **Morris1962!** ​ ) with the above wordlist after some time, which


​


​



​


​ ​

​

reveals a weak public key file.


​


​



​


​ ​

​


It is possible to generate the private key using RsaCtfTool with the command **RsaCtfTool.py** ​

**--publickey ./rootauthorizedsshkey.pub --private**


Once the private key file is obtained, it is possible to SSH in as root and obtain the flags from

**/home/frank/user.txt** and **/root/root.txt** ​


Page 9 / 13



​


​ ​

​


​


​


## **Appendix A**

from pwn import *

payload = "A"*28 + p32(0xffffd630) + shellcode


_jail_bof.py_


Page 10 / 13


## **Appendix B**

Page 11 / 13


Page 12 / 13


outfile = open("wordlist.txt", "w")

print ("Done!")

_wordlistgen_jail.py_


Page 13 / 13


