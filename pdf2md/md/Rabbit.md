# Rabbit

*Converted from: Rabbit.pdf*

---

# Rabbit
## **25 [th] October 2018 / Document No D18.100.22**

**Prepared By: egre55**

**Machine Author: lkys37en**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

Rabbit is a fairly realistic machine which provides excellent practice for client-side attacks and

web app enumeration. The large potential attack surface of the machine and lack of feedback for

created payloads increases the difficulty of the machine.


## **Skills Required**


  - Basic knowledge of web application

vulnerabilities and associated tools

  - Basic Windows knowledge


## **Skills Learned**


  - Open Office macro modification

  - Payload creation

  - Authorisation bypass

  - SQL injection identification and

exploitation

  - Windows services and file system

permission enumeration


Page 2 / 10


## **Enumeration** **Nmap**

masscan -p1-65535 10.10.10.71 --rate=1000 -e tun0 > ports


ports=$(cat ports | awk -F " " '{print $4}' | awk -F "/" '{print $1}' | sort -n | tr '\n' ',' | sed 's/,$//')


nmap -Pn -A -p$ports 10.10.10.71


Nmap reveals that Active Directory Domain Services, Microsoft Exchange and IIS are installed,

along with other potentially interesting ports such as 8080.


Dirsearch can be used to enumerate port 8080 further and identify any interesting directories.


python3 /opt/dirsearch/dirsearch.py -u http://10.10.10.71:8080/ -e php -x 403 -w

/usr/share/dirbuster/wordlists/directory-list-2.3-small.txt


Page 3 / 10


## **Dirsearch**

This reveals a Joomla installation and a complaint management system, which is worth further

examination.


Page 4 / 10


## **Exploitation** **Burp**

It is possible to login to the complaint management system as either a Customer, Employee or

Administrator. Typically, additional (potentially vulnerable) functionality is available once logged

in, and the site allows customers to register an account and login.


It seems that the site controls authorisation based on the value of the “mod” parameter, which is

accordingly set to “customer”.


Page 5 / 10


Inspecting the “Assign Complaint” request reveals several parameters. Replacing the value of

“compId” with a single quote results in a SQL error, and introducing a delay with “2 AND sleep(5)”

further validates this SQL injection vulnerability.


Page 6 / 10


## **Sqlmap**

Sqlmap can automate this process, and running this tool confirms that the parameter is

vulnerable to blind and error-based SQL injections using various techniques.


sqlmap -r rabbit.req --dbms=mysql -p "compId" --risk=3 --level=3 --batch


Enumeration of the available databases using “--dbs”, reveals a “secret” database, which is worth

further examination.


sqlmap -r rabbit.req --dbms=mysql -p "compId" --risk=3 --level=3 --batch -D secret --dump


Sqlmap extracts the usernames and associated password hashes, and is able to crack a number

of them.


Page 7 / 10


When finding passwords on a network it is worth seeing if they can be used for other services.

Attempting to login to Outlook Web Access as Ariel is successful.


There are several emails in Ariel’s inbox, which indicate that the company has adopted

OpenOffice as the standard Office Suite, and that Powershell Constrained Language Mode is

enabled. OpenOffice has support for macros, which can be used to gain the initial foothold.


The “New-Object” cmdlet is used in PowerShell reverse shells, but this is not an allowed type in

Constrained Language Mode.


Although there are documented Constrained Language Mode bypasses, the email didn’t mention

other application whitelisting controls such as AppLocker or WDAC, and so a binary payload may

be a better option.


Reference:

[https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_lang](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_language_modes?view=powershell-6)

[uage_modes?view=powershell-6](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_language_modes?view=powershell-6)


Page 8 / 10


## **Foothold** **Maldoc and Payload creation**

The OpenOffice maldoc can be created using the Metasploit module

“exploit/multi/misc/openoffice_document_macro”. Once created, modification is required in order

to replace the default PowerShell payload.


After renaming is with a zip extension and extracting, the file below is edited.


Basic/Standard/Module1.xml


The modified macro payload uses Powershell Invoke-WebRequest (allowed in Constrained

Language Mode) to download a malicious binary and proceeds to execute it.


In order to evade detection by Antivirus, Shellter can be used to backdoor a binary that

legitimately instantiates network connections, such as plink.exe.


After zipping the macro contents, renaming with a .odt extension, and standing up a web server

to serve the malicious binary, the email is ready to send.


Page 9 / 10


## **Privilege Escalation**

After a short while, a shell is received as a low privileged user and the system can be

enumerated. There is a wamp folder in the root of the C:\ and wamp is running as SYSTEM.


Inspection of the permissions on C:\wamp64\www reveals that the “BUILTIN\Users” group has

the ability to write and append data (AD/WD).


Reference:

[https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/cc753525(v=ws.10))

[-2008/cc753525(v=ws.10)](https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2008-R2-and-2008/cc753525(v=ws.10))


Page 10 / 10


