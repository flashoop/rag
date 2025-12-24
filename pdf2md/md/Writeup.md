# Writeup

*Converted from: Writeup.pdf*

---

# Writeup

25 [th] January 2024 / Document No D24.100.265


Prepared By: C4rm3l0 & MinatoTW


Machine Author: jkr


Difficulty: Easy


Classification: Official

## **Synopsis**


Writeup is an easy difficulty Linux box with DoS protection in place to prevent brute forcing. A CMS

susceptible to a SQL injection vulnerability is found, which is leveraged to gain user credentials.

The user is found to be in a non-default group, which has write access to part of the PATH. A path

hijacking results in escalation of privileges to root.
### **Skills Required**


Web Enumeration


Linux fundamentals
### **Skills Learned**


Path hijacking


Process enumeration

## **Enumeration**
### **Nmap**






An initial Nmap scan reveals SSH and Apache running on their default ports. Additionally, Nmap

has identified the existence of a `/robots.txt` file on the web server, which is typically used to tell

crawlers which URLs they may or may not visit. In the context of penetration testing, this can

oftentimes reveal interesting information about hidden endpoints on a given server.
### **HTTP**


Browsing to port 80 we see a retro style page.


We see that the server has DoS protection enabled, so we will hold back on using directory

scanners and fuzzers for enumeration.


We proceed to check out the `/robots.txt` endpoint, which contains a disallowed entry, namely




Browsing to `/writeup` we see a page containing box writeups.

Looking at the cookies via our browser's developer console, we spot a cookie named `CMSSESSID` .


We deduce that the server must be hosting some kind of Content Management System (CMS), but

we don't know which. If we take a look at the page's HTML source, we find the following metadata

in the site's header:



We now know that the site is running `CMS Made Simple` . Furthermore, we see that the Copyright

is for 2004-2019, so this must be a 2019 version.


## **Foothold**

Going to `exploit-db` and searching for this service leads us to a [SQL injection vulnerability](https://www.exploit-db.com/exploits/46635) from

the same year ( `CVE-2019-9053` ). Looking at the proof of concept (PoC) script, we see that it’s

exploiting a time-based, blind injection:





We download the script and supply it with the URL of our target.







It finds the username “jkr”, password hash, and the salt.

We can use `hashcat` to crack the MD5 hash. Copy the hash into a file in the format `hash:salt`

and

then use mode 20 to crack it:














The hash is cracked as `raykayjay9` . The credentials `jkr:raykayjay9` are used to SSH into the

box.







The user flag can be found at `/home/jkr/user.txt` .

## **Privilege Escalation**


We start our enumeration by looking at our user's groups.







These mostly consist of default Debian groups, however, `staff` sticks out as it is non-standard.


[According to Debian documentation:](https://wiki.debian.org/SystemGroups)


**staff** : Allows users to add local modifications to the system (/usr/local) without needing root

privileges (note that executables in /usr/local/bin are in the PATH variable of any user, and

they may “override” the executables in /bin and /usr/bin with the same name). Compare

with group “adm”, which is more related to monitoring/security.

As `staff`, we can write to `/usr/local/bin` and `/usr/local/sbin` :





Both of these paths are typically in the `root` user's `$PATH` environment variable, which means

that we could replace a program that `root` is likely to run out of those directories with a malicious

file containing a payload that will allow us to escalate our privileges.

To see what the `root` user might be doing on the system, we upload [pspy](https://github.com/DominicBreuker/pspy) to the machine.



We run the tool in one shell and proceed to SSH into the box via another shell.





As we SSH into the machine, `root` uses `sh` to run `/usr/bin/env`, and we see that `motd` was

called and the file `10-uname` was accessed. We also see that the `PATH` specified before running

`run-parts` includes two directories that we can write to, at the very start.
### **Path Hijacking**

With that in mind, we will now create a malicious `run-parts` file in `/usr/local/bin`, which we

know will be executed as soon as we SSH into the machine.

Using the following one-liner, we create an executable payload that will turn the `bash` binary into

an SUID binary, effectively giving us a `root` shell.


Now, as soon as we SSH into the machine as `jkr`, we see that our payload was triggered, as the

SUID bit is set on `/bin/bash` :







We can now use the modified binary to obtain a root shell, simply by running it using the `-p` flag

to maintain the privileges.







The final flag can be found at `/root/root.txt` .


