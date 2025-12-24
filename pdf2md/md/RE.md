# RE

*Converted from: RE.pdf*

---

# RE
## **12 [th] November 2019 / Document No D19.100.48**

**Prepared By: MinatoTW**

**Machine Author: 0xdf**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 15


## **SYNOPSIS**

RE is a hard difficulty Windows machine, featuring analysis of ODS documents using Yara. A

maliciously crafted document can be used to evade detection and gain a foothold. The box uses

an old version of WinRAR, which is vulnerable to path traversal. This is exploited to drop a shell to

the web root and land a shell as the IIS user who has write access to the project folder. A Ghidra

project is then uploaded to the folder to exploit XXE and steal admin hashes.


## **Skills Required**


  - Enumeration

  - VBA macros


## **Skills Learned**


  - Evading Yara

  - Exploiting WinRAR path traversal

  - Ghidra XXE


Page 2 / 15


## **Enumeration** **Nmap**





We find IIS and SMB running on their usual ports.

## **IIS**


Browsing to port 80 redirects us to reblog.htb.



Page 3 / 15


​ ​



Add reblog.htb to the hosts file and browse to it. We come across a website with various blog

posts.


According to the post above, users are supposed to drop any kind of ods (Openoffice

spreadsheet) documents into the malware dropbox. Another post states that they are using Yara

to analyze the documents, which directs us to this [post​](https://0xdf.gitlab.io/2019/03/27/analyzing-document-macros-with-yara.html) . ​


We should keep these rules in mind while creating a malicious document, as it’s likely that the

box uses this.


Page 4 / 15



​ ​



​ ​


## **SMB**

Let’s check SMB to see if there are any open shares, which can be enumerated using smbclient.


The -N flag is used to connect without credentials. We can see a “malware_dropbox” share,

which must be the dropbox that post was talking about.

## **Foothold** **Creating Malicious ODS Document**


Now that we have access to the dropbox, we can try creating a malicious document which

executes a macro on opening. According to the blog post, the dropbox detects macros created

with metasploit, and any that execute powershell.exe or cmd.exe directly.


In order to evade detection, base64 encoded commands can be used. The “enc” parameter in

PowerShell can be used to execute commands encoded as base64 strings. Let’s try pinging

ourselves using the macro.


Page 5 / 15


The command is first encoded as a UTF-16 string (the default Windows encoding), followed by

base64 encoding. The final command looks like:





As Yara does static analysis of the document, we can split the command up into multiple strings,

and then execute it after concatenation. Launch OpenOffice or LibreOffice Calc, go to Tools >

Macros > Organize Macros > LibreOffice Basic, expand Untitled1 and select “Standard”. Click on

“New” to create a new macro.


Name it anything and click on Ok. Enter the following code under Module1 after the editor opens.





We’ve split up the command into three strings and concatenate them before execution using the

Shell() function.


Page 6 / 15


Next, save the document and close the editor. We need to make sure that the macro is run as

soon as the document is opened. To do that, go to Tools > Customize and click on the Events

tab, then select “Open Document” and click on “Macro” to assign it a macro. Now expand the

document tree and select the Macro name on the right.


Clicking on Ok should assign our macro to the “Open Document” event.


Save the document, start an ICMP listener and upload the document to the dropbox.


Page 7 / 15


​ ​



​ ​



We received ICMP requests on our listener, which confirms code execution. Let’s try

downloading and executing a TCP reverse shell which can be found [here​](https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcp.ps1) .​


Add the following line to the end of tcp.ps1:



​ ​



​ ​



​ ​



​ ​


Swap the base64 encoded payload in the existing macro with the one created above and ensure

an HTTP server is running in the folder.


Page 8 / 15


A shell as the user luke should be received after uploading the document.

## **Lateral Movement**


Looking at the IIS root folder, we find three sub-folders which we don’t have access to.


We’ve already inspected the IP and the blog vhost. However, there seems to be another vhost

named “re”. Let’s add re.htb to the hosts file and browse to it.


Page 9 / 15


The page displays the message above, but examination of the source code reveals the following:



According to this, the site will let users upload Ghidra projects in the form of ZIP archives. Let’s

put this aside for now and keep enumerating. Browsing to the user’s documents folder, a


Page 10 / 15


​

​ ​



powershell script is seen. The script processes uploaded ods files and executes them. We see

the following lines at the end of the script.


​

​ ​



​

​ ​



​

​ ​



It compresses the uploaded documents into a ZIP archive, and then moves them into the

“C:\Users\luke\Documents\ods” folder with a “rar” extension for future processing.


Winrar versions prior to 5.6.1 suffer from an arbitrary write vulnerability via path traversal, in the

context of the user opening the archive. The [Evil-Winrar-Gen​](https://github.com/manulqwerty/Evil-WinRAR-Gen) program can be used to craft a

malicious archive. Let’s try writing [this​](https://github.com/tennc/webshell/blob/master/fuzzdb-webshell/asp/cmd.aspx) ​ webshell to the writable uploads folder in the re.htb vhost.


A file named “shell.rar” should be generated after following the above steps. The -e parameter is

used to specify the file to be extracted (to the path specified by -p), while the -g parameter can be

any file. Next, transfer the file to the ods folder.


Page 11 / 15



​

​ ​



​

​ ​


The webshell should be found at /cmd.aspx after the file gets processed.


Let’s execute the tcp.ps1 script once again to get a shell as the IIS user.



Page 12 / 15


​ ​


​ ​

​


## **Privilege Escalation**

The IIS user has access to the proj_drop folder used to store uploaded Ghidra projects.


​ ​


​ ​

​



​ ​


​ ​

​



Ghidra is vulnerable to [XXE​](https://github.com/NationalSecurityAgency/ghidra/issues/71) ​ due to improper handling of the XML files present in a project. We

can exploit this to steal the NetNTLMv2 hash of the user who opens it. Ghidra can be

downloaded from its official website [here​](https://ghidra-sre.org/) .​ Extract the contents of the downloaded zip file, and

execute the **ghidraRun** ​ binary to start Ghidra. Next, click on File > Project > New Project, enter

any name and click Finish.


Page 13 / 15



​ ​


​ ​

​


The folder structure should look like the image above. Now, the project.prp file can be edited to

include the XXE payload.







Upon opening the file, Ghidra will send a request to our machine, and our listening responder will

capture the user’s NetNTLMv2 hash. Start Responder, archive the entire directory and transfer it

to the proj_drop folder.


The hash for the user Coby should shortly be received. Copy it to a file.


It can be cracked using John The Ripper or Hashcat and the rockyou.txt wordlist.


Page 14 / 15


The hash is cracked and the password is revealed to be “championship2005”, which can be

used to login as the Coby. The user Coby is in the “Administrators” and “Remote Management

Users” group, so we can use WinRM to execute commands as him. Let’s use Invoke-Command to

execute a reverse shell.


Executing the commands above should give us a reverse shell as Coby, after which the final flag

can be accessed.


Page 15 / 15


