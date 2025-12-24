# Conceal

*Converted from: Conceal.pdf*

---

# Conceal
## **08 [th] May 2019 / Document No D19.100.20**

**Prepared By: MinatoTW**

**Machine Author: bashlogic**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 18


## **SYNOPSIS**

Conceal is a “hard” difficulty Windows which teaches enumeration of IKE protocol and

configuring IPSec in transport mode. Once configured and working the firewall goes down and a

shell can be uploaded via FTP and executed. On listing the hotfixes the box is found vulnerable

to ALPC Task Scheduler LPE. Alternatively, SeImpersonatePrivilege granted to the user allows to

obtain a SYSTEM shell.


## **Skills Required**


  - Networking

  - Windows Enumeration


## **Skills Learned**


  - IKE Configuration



Page 2 / 18


​ ​


## **ENUMERATION** **NMAP**

TCP Full Port Scan


​ ​



​ ​



​ ​



After completion we find no ports open on TCP. Let’s do a UDP Scan.


​ ​



​ ​



​ ​



​ ​



We find port 500 to be open, which on doing a script scan appears to be running IKE.


IKE stands for Internet Key Exchange which is used to establish a secure connection in the IPSec
protocol. More on it [here​](https://en.wikipedia.org/wiki/Internet_Key_Exchange) .​


Page 3 / 18



​ ​


## **IKESCAN**

In order to configure the VPN we’ll need the various parameters associated with it like the

encryption algorithms, protocol, pre-shared key etc.


To do this we’ll use a utility ike-scan.









We obtain some information like Encryption type 3DES, SHA1 hash algorithm and the IKE Version
being v1 among others. Another thing to be noted is the Auth parameter which needs a PSK
(Pre-shared Key)


Page 4 / 18


​ ​


## **SNMPWALK**

To enumerate the network information further we can use snmpwalk.


The string “IKE VPN password PSK - 9C8B1A372B1878851BE2C097031B6E43” is obtained. The
password is 32 characters long which could be an md5 hash or NTLM hash.


[Trying it on Hashkiller​](https://hashkiller.co.uk/Cracker) cracks it as an NTLM hash. ​


The cracked PSK is Dudecake1!

## **STRONGSWAN CONFIGURATION**


To establish a connection we’ll use strongswan which allows use to configure ipsec.



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​


Page 5 / 18


​



As we know the PSK already we can configure it in /etc/ipsec.secrets.


​



​



​



It’s in the format source destination : PSK, as the source is always us we can ignore it.

Next open up /etc/ipsec.conf in order to configure the connection and it’s parameters. The
[strongswan documentation consists of the list of parameters available. The minimal configuration ​](https://wiki.strongswan.org/projects/strongswan/wiki/ConnSection)
looks like this.



​



​



​


We define a connection named Conceal. The type of connection is just transport as we are only
encrypting the traffic and not creating a tunnel. The keyexchange parameter is used to specify
the version of protocol to be used which be obtained earlier as v1. The right parameter is used to
specify the destination host. The authby parameter will be psk obtained from ikescan. We
assume the protocol to be TCP, in case it doesn’t work it’ll be switched with UDP. It is specified
using the protoport parameters. The esp parameter specifies the cipher suites in the format
encryption-hashing. The ike parameter is the same but we need to specify even the group which
is modp1024.



​



​



​


We stop the ipsec service to kill all related processes and start it in nofork mode in order to
debug it.


Page 6 / 18


The message “Conceal established….” confirms that the connection was successful.

## **NMAP**


Running nmap again after successful connection lets us bypass the firewall and discover ports.

We need to use -sT for a full connect scan.





Now the ports are open like any normal windows box. IIS is running on port 80 and FTP has
anonymous login enabled.


Page 7 / 18


## **IIS - PORT 80**

The page hosts a standard IIS Installation.

## GOBUSTER


Running gobuster found an interesting folder which could be linked to FTP.



Page 8 / 18


## **FTP**

FTP has anonymous login enabled. After logging in we land in an empty directory. To test if the

/upload directory is linked to FTP we upload a test file.


And then to verify,





Having verified this we can drop a shell and execute it.



Page 9 / 18


​ ​


## **FOOTHOLD**

We can execute system commands with asp scripts. We’ll use this simple cmd.asp webshell [here​](https://github.com/tennc/webshell/blob/master/fuzzdb-webshell/asp/cmd.asp) .​



​ ​



​ ​



​ ​



​ ​


Now we can navigate to http://10.10.10.116/upload/cmd.asp to execute commands.



​ ​


Page 10 / 18


​ ​


## **EXECUTING SHELL**

[We’ll use the TCP Reverse Shell from Nishang​](https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcp.ps1) . ​



​ ​



​ ​



​ ​


Add the reverse shell command to the end of the script. Start the http server and execute.



​ ​



​ ​



​ ​


And we receive a shell as the user Destitute.



​ ​



​ ​


Page 11 / 18


​ ​


## **PRIVILEGE ESCALATION** **ENUMERATION**

While running systeminfo we find the version to be WIndows 10 Enterprise Build 15063 and in the

HotFix section we see that nothing was patched.


[The box could be potentially vulnerable to ALPC Task Scheduler LPE CVE-2018-8440​](https://nvd.nist.gov/vuln/detail/CVE-2018-8440) . One ​

important condition for the exploit to work is the Read Execute access for Authenticated Users

group on the C:\Windows\Tasks folder.



​ ​



​ ​



​ ​



​ ​



​ ​


Page 12 / 18



​ ​


​ ​


​ ​


​


## **ALPC SCHEDULER LPE**

Having confirmed the vulnerability we can now exploit it.


We’ll use the ALPC DiagHub exploit - [https://github.com/realoriginal/alpc-diaghub​](https://github.com/realoriginal/alpc-diaghub) whch ​

combines the ALPC exploit with DiagHub Service to execute the DLL. More information on

DiagHub [here​](https://googleprojectzero.blogspot.com/2018/04/windows-exploitation-tricks-exploiting.html) .​


Download the 64 bit version and then compile a DLL using mingw. Here’s a sample code which

sends a reverse shell using sockets on windows. It creates a socket, sends back a connect, runs

the command and stores in a buffer to return the output. For a detailed explanation check this

[link. ​](https://scriptdotsh.com/index.php/2018/09/04/malware-on-steroids-part-1-simple-cmd-reverse-shell/)


Page 13 / 18



​ ​


​ ​


​


Page 14 / 18


Change the IP and port and then compile the DLL.





Transfer the DLL and the binary to the box via wget. Then execute,





The process should just hang.



Page 15 / 18


​ ​



But on the other side we receive a SYSTEM shell!

## **ALTERNATIVE PRIVESC** JUICY POTATO


Looking at the privileges of the user we notice that SeImpersonate is enabled.


As BITS is disabled we can’t use rotten or lonely potato. However, [juicy potato​](https://github.com/ohpe/juicy-potato) ​ can make use of

other COM server and any port other than 6666. Download the binary from the releases,


Page 16 / 18



​ ​



​ ​


​ ​



​ ​



​ ​



Create a bat script with contents,


​ ​



​ ​



​ ​



Transfer both the script and exe to the box. Now we need valid CLSID to exploit it. There’s a list
of CLSIDs for Windows 10 Enterprise [here​](https://github.com/ohpe/juicy-potato/tree/master/CLSID/Windows_10_Enterprise),​ out of which we can choose one which gives “NT
AUTHORITY\SYSTEM”.

Run the binary with required arguments,



​ ​



​ ​



​ ​



​ ​


Now verifying the proof.txt we find the details for SYSTEM.


Similarly, we create another bat file to change Administrator password.



​ ​



​ ​



​ ​



​ ​


Page 17 / 18


Run the command,





Once the command succeeds we can use psexec to get a shell as SYSTEM.





Page 18 / 18


