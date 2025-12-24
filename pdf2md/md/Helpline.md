# Helpline

*Converted from: Helpline.pdf*

---

# Helpline
## **13 [th] November 2019 / Document No D19.100.31**

**Prepared By: MinatoTW**

**Machine Author: egre55**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 43


## **SYNOPSIS**

Helpline is a hard difficulty windows box which needs a good amount of enumeration at each

stage. A ServiceDesk web application is found to be vulnerable to XXE exposing sensitive data

which gives a foothold. There are hashes on the PostgreSQL database which can be cracked to

gain access to a user who can read Windows Event Logs. These logs contain user credentials

and can be used to move laterally. Enumeration of the file system reveals a script vulnerable to

command injection, which allow for code execution in the context of another user. The local

Administrator credentials are then found in the form of powershell securestring.


## **Skills Required**


  - Enumeration

  - Powershell


## **Skills Learned**


  - XXE

  - Applocker enumeration

  - Event log enumeration



Page 2 / 43


## **ENUMERATION** **NMAP**





We find SMB open on 445 along with WinRM on port 5985. There’s a web application running on
port 8080.

## **SMB**


Let’s use SMB guest authentication to see if there are open shares.





We get an Access Denied error meaning guest mode authentication is not allowed.



Page 3 / 43


## **HTTP**

Browsing to port 8080 we find a ServiceDesk Plus (SDP) application.


Trying the default guest credentials guest / guest gets us in. Enumerating the solutions we find a

ticket which says Password Audit.


It has a xlsx attachment, download it to inspect.


Page 4 / 43


​



The xlsx file can be viewed with any free Office software like Open Office or Libre Office or even

Google Sheets. Opening it up in sheets we don’t see any sensitive information.


However on going to View > Hidden Sheets > Password Data we find hidden information. It

contains a list of weak passwords found during a Password Audit.


We see a file location where the audit is saved i.e C:\Temp\Password Audit\it_logins.txt. Lets ​
save this for later.


Page 5 / 43



​



​


​


​


## **XXE EXPLOITATION (CVE-2017-9362)**

At the login page we that the page is running version 9.3.


A google search about it yields [this​](https://labs.integrity.pt/advisories/cve-2017-9362/index.html) post, describing a SDP XXE vulnerability. Lets verify this.

From the article we know that the API /api/cmdb/ci is the vulnerable component exploited

through the INPUT_DATA parameter. Directly hitting it we find that it needs XML data.


Lets send this to burp for further exploitation. A potential file which can be read is the Password

Audit file at C:\Temp\Password Audit\it_logins.txt. ​


Page 6 / 43



​


​



​


​


The XML payload to read the file would be,







Lets send this payload to see if we can read the file. Request the API in browser and change the

request type to POST in burp. We need to add the header below, for the server to accept our

XML input.





Page 7 / 43


​



Select the payload > Right Click > Convert selection > url encode all characters and hit go.
The server responds we see the contents of the file.


Cleaning the text and copying it, it says:


​



​



​



​



Now we have the credentials for a local Windows account alice / $sys4ops@megabank!​


Let’s use it to login via WinRM.


Page 8 / 43


​ ​


## **FOOTHOLD**

We can use the quickbreach Powershell docker, which enables us to do PSRemoting from Linux

using Negotiation authentication mode, and gives us a more interactive shell. More information

[on it can be found here​](https://blog.quickbreach.io/ps-remote-from-linux-to-windows/) . ​



​ ​



​ ​



​ ​


Let’s try to login as alice with the gained credentials now.



​ ​



​ ​



​ ​


And we have a session as alice on the box.


The box has strict AppLocker policy, and Powershell Constrained Language Mode is enabled, so

we can’t directly use automated tools to enumerate, which calls for manual enumeration.


Page 9 / 43



​ ​


​


## **LATERAL MOVEMENT** **ENUMERATION**

Let’s enumerate the configuration files of ServiceDesk for potential credentials. Listing the drives

on the box we see that it has a E: drive.


​



​



​



Going into the E: drive we see that it contains the ServiceDesk installation.


In the ManageEngine\ServiceDesk folder we find a psql folder which is a postgresql installation.

According to the [documentation​](https://www.manageengine.co.uk/products/service-desk-msp/help/installation-guide/documents/configure-database.html) the postgres server is running on port 65432 as the postgres

user. Let’s try connecting to it.



​



​



​



​


The \dt command is used to list tables. We find many tables out of which aaapassword looks

interesting.


Page 10 / 43



​


Let’s view the data in that table.





We find some password hashes associated with some IDs but not the usernames. The
usernames and IDs are found to be in the aaauser table.





It’s obvious that the password_id is the user_id and is the foreign key. Let’s select the username
and password from these two tables.





It selects the username and password from the tables where the user_id and password_id is the
same. Executing the query maps the bcrypt encrypted password hashes to the users.


Page 11 / 43


​



​



Copy these to a file in the format username:hash for cracking them.


​



​



​



​



John was able to crack two hashes quickly for Zachary and Fiona. Lets see the information about

these users.


​



​



​



Looking at the group memberships of Zachary we see that he’s not in the "Remote Management

Users" group, so we can’t login via WinRM. However, he is in the "Event Log Readers" group.


According to this blog [post​](https://blogs.technet.microsoft.com/janelewis/2010/04/30/giving-non-administrators-permission-to-read-event-logs-windows-2003-and-windows-2008/) the group Event Log Readers gives non-admin users access to

System logs. We can use this to our advantage if we can find any sensitive information in the

logs. The security logs could contain potential user information. We can export such logs using

wevtutil utility.


Page 12 / 43



​


​



​



However, we are denied access. This is due to the kerberos [double hop​](https://blogs.technet.microsoft.com/askds/2008/06/13/understanding-kerberos-double-hop/) problem. We can

overcome this by using CredSSP authentication. For this we need to configure a Windows VM.

To enable CredSSP authentication on Windows 10, the following steps are performed.



​



​



​


Instead of using the VPN on Windows we can use IP forwarding on linux. First on linux,



​



​



​


Change eth0 to your VM connected interface. Now on windows, execute the command:



​



​



​


Now we should be able to ping the box from Windows.



​


Page 13 / 43


We should now be able to login as alice using credssp authentication.





We can go ahead and export the event logs now as zachary.





After the export is complete we can search for information in the file. We have a list users on the

box. Let's find information related to them.


Page 14 / 43


On looking for information related to tolu we some commands.


We see the /p flag which is used to specify the password. So it could possibly be the password.

## **LOGIN AS TOLU**

Looking at her groups we see that she’s a member of Remote Users which allows us to WInRM.









This lets us login and get the user flag.

## **ENUMERATION AS TOLU**


Earlier while enumerating as alice we came across Backups and Scripts folders which we didn’t

have permissions to access. Let’s go back and check them now.


Page 15 / 43


It’s seen that even Tolu doesn’t have access to backups but she has access to the scripts folder.


Let’s see what it contains.


It contains a powershell script and text files. Lets see what the script does.





Page 16 / 43


Page 17 / 43


Page 18 / 43


Apparently the script is being maintained by leo and probably run by him. The script does a

bunch of queries to check if the ServiceDesk is running. The interesting part comes when it

copies the backups.txt and sanitizes the input.



After sanitization the script uses each line as a folder name and copies it to the Restore folder.





The Invoke-Expression command can be abused to inject commands but due to heavy
sanitization we can’t directly inject commands into the script.

## **COMMAND INJECTION**


As there are so many extensions filtered let’s view the Applocker rules.





Due to firewall restrictions and CLM we can’t use normal ways to transfer the file. But as port 80

is open we can use Powershell Invoke-RestAPIMethod to send the file as a POST request.





Page 19 / 43


Following the above steps the file should be transfered. Open up the policy.xml file and delete

the HTTP headers.


Once done open it up in a browser for better syntax highlighting and formatting. Looking at the

rules, DLL rules haven’t been enforced.


And searching for rundll32 we see that it is allowed by the applocker.


This should allow us to execute DLLs using rundll32. Looking at the configuration further we find

that E:\Scripts has been whitelisted to allow script execution.


Page 20 / 43


Having figured that out we need to find a way to inject commands. To do this we can use the

environment variables. For example, the variable PATHEXT can be used to represent ";".


So in order to execute a .bat script in the same folder we can create the following command.





Which will evaluate to ;iex .\C.BAT|iex;.


First we need to create a DLL with the code,



Page 21 / 43


Page 22 / 43


It uses raw sockets to execute commands through them and return the output. Compile it using

mingw.





Page 23 / 43


The contents of backups.txt is,





The contents of C.BAT is,





Transfer it to the box using wget and python simple http server.





Page 24 / 43


Now, when the script runs the next time we should have a shell. Judging from the timestamps of

output.txt the script runs every 5 minutes.




## ALTERNATE METHOD

Among all the sanitization rules we see that [tab] or \t isn’t considered. The replace for

whitespace doesn’t work on tab. So we can inject our commands using [tab] and base64

encoded commands. For example,





Where `t is tab and `$ is for $. The command looks like this simplified,





We create a file script with our commands. For example,





After a while the file out should be created with the output of whoami /all for Leo.



Page 25 / 43


Lets swap the script with a command to execute a reverse shell. We can use the DLL we created

earlier to gain the shell.





And the next time the script executes we’ll have a shell.

## ALTERNATE METHOD #2


Powershell allows typecasting between integers and chars. For example, ‘a’ can be represented

as [char]97.


We can create a small python script which converts strings to this format and pipe it to iex.


Page 26 / 43


To execute whoami our script would look like,







Executing the script gives us the command without spaces or blacklisted characters. Lets try this

normally to see if it works.

And on the box.


We see the output of whoami which means our script works. Now alter the script to work with the

command injection.





Page 27 / 43


Now execute the script and copy the output to backups.txt for execution.





Now when the script runs the next time we should get a shell back.



Page 28 / 43


## **PRIVILEGE ESCALATION** **RETRIEVING CREDENTIALS**

Going into Leo’s Desktop we see a file named admin-pass.xml.


Looking at the contents it looks a Powershell secure string.


Lets create a credential object out of it to retrieve the password.





Following the above steps we should be able to retrieve the password in cleartext.



Page 29 / 43


Now we have the Administrator’s password and can use CredSSP authentication to get the flag.











And we have a root shell !



Page 30 / 43


​


## ALTERNATE METHOD

Going back to the session as Alice, we had access to postgresql server. The server is running as

SYSTEM. Using psql we can read and write arbitrary files but not the flags as they are encrypted.

We need to use SYSNATIVE path to write our DLL, and avoid it getting redirected to WOW64.


​



​



​



After following these steps our DLL should be written to System32.


Now that we have written our DLL, we need to get it executed using the DiagHub exploit. Clone
this [simplified version​](https://github.com/decoder-it/diaghub_exploit) of the exploit by decoder. Open it up in Visual Studio. Now we need to
make a few changes before using this. Change the valid_dir string to a writable folder like
C:\Windows\Temp.


Page 31 / 43



​


​


​ ​



​


​ ​



Next in the AddAgent method change the dll file and hardcode pwn.dll.


Now proceed to build the solution as a 32-bit executable and download the executable on the
box.

Note: It is important to compile the executable as a 32-bit binary due to some problems with
dependencies on the box.


​


​ ​



​


​ ​



​


​ ​



​


​ ​



TRIGGERING THE DLL USING REFLECTIVE INJECTION


We can’t directly execute the binary due to Applocker. However, as DLL execution is allowed we

[can use ​PowerShdll combined with](https://github.com/p3nt4/PowerShdll) [Invoke-ReflectivePEInjection​](https://github.com/PowerShellMafia/PowerSploit/blob/master/CodeExecution/Invoke-ReflectivePEInjection.ps1) to trigger it. PowerShdll helps us

avoid Powershell Constrained Language Mode. Download both of them locally. The PEInjection

script needs to be modified before use. On line 1003, make this change,


​ ​



​


​ ​



​


​ ​



​


Before we’re able to inject code using the script we need to bypass AMSI. Grab a copy of the

[script from here​](https://github.com/rasta-mouse/AmsiScanBufferBypass/blob/master/ASBBypass.ps1) . Rename both the scripts and the function name to something else so that it isn’t ​

flagged by Windows Defender before our bypass executes.


Page 32 / 43


Now we need to create a PowerShell script which downloads and executes our code. Create a

PowerShell script with the contents:





Note: I renamed Invoke-ReflectivePEInjection to bad-function in the script.


Now download the PowerShdll 32 bit and the ps1 script to the box.





And to execute the script we’ll need to create a base64 payload.





Then we use this string to execute PowerShdll via rundll32.





Page 33 / 43


After executing the command on the box we should have a SYSTEM shell.


ALTERNATE EXECUTION USING A DLL


[We can also compile the exploit as a DLL and trigger it using rundll32. Download this ​port](https://github.com/MinatoTW/diaghub_exploit) of

decoder’s version which is modified to compile as DLL. It just has one minor change in the loadll

method this way,



There’s a compiled version in the Release folder. The DLL is hardcoded to execute pwn.dll in

System32 folder. Download it to the box and run it,





Page 34 / 43


​ ​



​ ​



​ ​



​ ​



And we should have a SYSTEM shell on the other side.


From here mimikatz can be used to obtain the flag as shown in the section below.

## ALTERNATE METHOD #2


[ServiceDesk is vulnerable to an authentication bypass as shown here​](https://www.exploit-db.com/exploits/42037) . Let’s try replicating this to ​

login as admin. Follow these steps.



​ ​



​ ​



​ ​



​ ​


After this we should be presented with the entire application as admin.



​ ​


Page 35 / 43


We can create a Custom Trigger and execute code. To do this Click on Admin > Custom Triggers.


Then click on New Action and create an action, set the criteria to match High priority.


Page 36 / 43


In the Script box enter a command like,





Then click on save to save the action. Now log in to the guest account and request a ticket.


Page 37 / 43


​



Set the priority to high for the action to trigger. Then click on add request. After a while we should

receive a shell as SYSTEM.

## **DECRYPTING FLAGS**


We won’t be able to read the flags due to EFS but we can decrypt them using mimikatz. Here’s a

[guide on how to achieve it. Using cipher.exe we can see that only Administrator can decrypt it. ​](https://github.com/gentilkiwi/mimikatz/wiki/howto-~-decrypt-EFS-files)


Page 38 / 43



​



​


First download mimikatz from the releases section.





Then download it to the box using powershell.





However, Defender would come in our way. Let’s disable it.





After this we should be able to run it without any problems.


Lets try to decrypt the file now. We got the thumbprint by using cipher /c already. Now we can

use the crypto module to export it.


Page 39 / 43


We now have the public key in the .der file and the private key is in a container named
3dd3e213-bce6-4acb-808c-a1b3227ecbde.


Lets verify this using the dpapi module.





We see that the pUniqueName field is the same as earlier container name.



Page 40 / 43


And now we have the masterkey {9e78687d-d881-4ccb-8bd8-bc0a19608687} with which it is

encrypted. Now we need to decrypt the masterkey for which we’ll need the password or the

hash. We can gain the SHA1 hash using sekurlsa command.





With this we can now decrypt the master key using the dpapi module.





With the masterkey the private key can be gained.





Page 41 / 43


Now we need to transfer these files locally to create the pfx. Use Impacket smbserver for easy

transfers. We need to use username and pass to prevent guest access.





And then on the box,





Once transferred use openssl to create the PFX.





Now transfer cert.pfx to the box and use certutil to import it.





Page 42 / 43


After this the flag should be readable.



Page 43 / 43


