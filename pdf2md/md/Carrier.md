# Carrier

*Converted from: Carrier.pdf*

---

# Carrier
## **13 [th] March 2019 / Document No D19.100.10**

**Prepared By: makelaris**

**Machine Author:**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 28


## **SYNOPSIS**

Carrier is a medium machine with a unique privilege escalation that involves BGP hijacking. The

initial access is pretty straight forward but with a little twist to it.


## **Skills Required**


  - Intermediate knowledge of networking


## **Skills Learned**


  - SNMP enumeration

  - Command injection

  - BGP hijacking



Page 2 / 28


​ ​ ​ ​


## **Enumeration** **nmap**

We see a filtered **ftp** ​ port, a running **ssh** ​ service, a website running on port **80** ​ and a **SNMP** ​ port.



​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​


Page 3 / 28


​


## **Website -TCP 80**

At first glance, there is a login page with **2** ​ distinct error code messages.


**1.** **Error 45007**

**2. Error 45009**



​



​


Page 4 / 28


## **Gobuster**





Page 5 / 28


​


​


## **Website - Directories** /debug

This page is just showing us the output of **phpinfo();** ​

## /tools/


This is a open directory with a file named **remote.php** ​, upon visiting we get this error message

about a expired license:


Page 6 / 28



​


​



​


​


## /doc/

This is also a open directory that contains 2 files named:


1. diagram_for_tac.png


2. error_codes.pdf



Page 7 / 28


​ ​ ​

​



diagram_for_tac.png


​ ​ ​

​



This image file is a **network topology diagram** ​ that shows **3** ​ different **BGP autonomous** ​

​



​ ​ ​

**networks**, we seem to be in **AS-100** ​ at this point as the login’s page banner suggest. This hints



​ ​ ​

​

that there isn’t just one machine involved in the exploitation process of this box.



​ ​ ​

​


Page 8 / 28



​ ​ ​

​


​



error_codes.pdf


The document file contains some sort of documentation for a **list of error codes** ​ :



​



​


Page 9 / 28


​ ​

​

​ ​



If we cross reference the two error codes from the main login page:


​ ​

​

​ ​




- We see that the license is now invalid/expired ( **/tools/remote.php** ​ - **45007)** ​

​

​ ​



​ ​

- The default **admin** ​ account uses the device’s serial number as the password

​ ​



​ ​

​

( **/index.php** ​ - **45009** ​ )



​ ​

​

​ ​


Page 10 / 28


​

​ ​


​ ​


​ ​

​ ​

​ ​


## **SNMP - UDP 161**

​

​ ​


​ ​


​ ​

​ ​

​ ​



**Simple Network Management Protocol** is a protocol for network management. It’s used for

​

​ ​


​ ​


​ ​

​ ​

​ ​



gathering information from, and configuring, network devices. To enumerate **SNMP** ​, we’ll use

​ ​


​ ​


​ ​

​ ​

​ ​



​

**snmpwalk**, it attempts to walk all of the available **Management Information Bases** ​ ( **MIBs** ​ ). Each


​ ​


​ ​

​ ​

​ ​



​

​ ​

**MIB** is a collection of information organized hierarchically and defines the properties of the

​ ​


​ ​

​ ​

​ ​



​

​ ​


corresponding managed object, these **Object Identifiers** ​ ( **OID** ​ ) uniquely identify objects in the


​ ​

​ ​

​ ​



​

​ ​


​ ​

**MIB** .


​ ​

​ ​

​ ​



​

​ ​


​ ​


​ ​

​ ​

​ ​



​

​ ​


​ ​


We see that **SNMP** ​ is enabled and the default **public SNMP community string** ​ is configured. So

​ ​

​ ​



​

​ ​


​ ​


​ ​

we’ll search the **OID** ​ that has the relevant information necessary in order to log in as **admin** ​,

​ ​



​

​ ​


​ ​


​ ​

​ ​

we’re looking for the **device’s serial number** ​, which we can find in the **entPhysicalSerialNum** ​



​

​ ​


​ ​


​ ​

​ ​

​ ​


Page 11 / 28


​ ​


​ ​ ​



**MIB** table, which has an assigned **OID** ​ value of ​ **1.3.6.1.2.1.47.1.1.1**, reading a bit of documentation

for this table we see:


_"The vendor-specific serial number string for the physical entity. The preferred value is the serial_

_number string actually printed on the component itself."_


​ ​ ​



​ ​


​ ​ ​



​ ​


​ ​ ​



​ ​


I believe that **SN** ​ stands for **Serial Number** ​, so we can log in as **admin** ​ with the following
credentials:


**●** **admin:NET_45JDX23**


Page 12 / 28



​ ​


​ ​ ​


​


## **Initial Access** **Website - Dashboard**

The main dashboard page indicates that the system is in **read-only** ​ mode since the license

expired. It also states that the router config will be reverted automatically every 10 minutes.


Page 13 / 28



​


## **Website - Tickets**

The tickets section contains hints about what we need do once we get access to the router.


Page 14 / 28


​

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



The most interesting tickets are:


**●** **#5 Closed**


​

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



**"** Rx / LoneWolf7653. User called in to report what is according to him a "critical security

​

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



issue" in our demarc equipment. Mentioned something about a **CVE (??)** ​ . Request contact

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

info and sent to legal for further action. **"** ​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


**●** **#6 Closed**


**"** Rx / CastCom. IP Engineering team from one of our upstream ISP called to report **a** ​

**problem with some of their routes being leaked again due to a misconfiguration on our**

**end.**

​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


Update 2018/06/13:​ Pb solved: Junior Net Engineer Mike D. was terminated yesterday.

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

Updated: 2018/06/15:​ **CastCom. still reporting issues with 3 networks:** ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

**10.120.15,10.120.16,10.120.17/24's**, one of their VIP is having issues **connecting by FTP** ​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​

**to an important server in the 10.120.15.0/24 network**, investigating...

​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


Updated 2018/06/16:​ No prbl. found, **suspect they had stuck routes after the leak and** ​

​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


​ ​

**cleared them manually** . **"** ​


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


​ ​

​


**●** **#8 Open**


​

​

​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


​ ​

​


**"** Rx / Roger (from CastCom): **wants to schedule a test of their route filtering policy,** ​

**asked us to inject one of their routes from our side** . He's insisted we **tag the route** ​

**correctly so it is not readvertised to other BGP AS'es** . **"** ​


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


​ ​

​


​

​

​


Things to note here:


​ ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


​ ​

​


​

​

​


- A mention of a **CVE** ​ - **#5** ​

​ ​ ​

​ ​



​

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

- Castcom is advertising **10.120.x.x** ​ routes, the **10.120.15.0/24** ​ subnet is hosting **"an** ​

​ ​



​

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

**important FTP Server"**, oh and mike is let go (rip). **#6** ​ - **#8** ​



​

​


​


​

​ ​

​


​ ​

​


​

​

​


​ ​

​ ​ ​

​ ​


Page 15 / 28


​

​ ​


## **Website - Diagnostics**

​

​ ​



Upon hitting the **Verify status** ​ button on the dashboard page, you see something that appears to

​ ​



​

be the output of a process listing command that filters **quagga** ​, the name of a **routing software** ​



​

​ ​

**suite** .



​

​ ​



​

​ ​


Page 16 / 28


## **Reverse shell**

The diagnostics page appears to be vulnerable to command injection, let’s investigate.


Page 17 / 28


​ ​ ​

​


## **Privilege Escalation** **Crontab**

We see that there is a scheduled job by root.


​ ​ ​

​



​ ​ ​

​



​ ​ ​

​



**restore.sh** basically stops the **quagga** ​ service, restores the **zebra** ​ and **bgpd** ​ settings back to their

defaults and restarts the service every **10 minutes** ​ .



​ ​ ​

​



​ ​ ​

​



​ ​ ​

​


Page 18 / 28


Page 19 / 28


## **Quagga - Configuration Files**








**●** **Zebra - Interface declaration and static routing**



Page 20 / 28


​ ​ ​

​ ​
​ ​




**●** **Bgpd - BGP routing protocol**


We can see here that we, as **r1** ​ (" **AS-100** ​ ") have two **BGP** ​ neighbors

  - **r2** with an assigned **10.78.10.2** ​ (" **AS-200** ​ ") IP address

  - **r3** with an assigned **10.78.11.2** ​ (" **AS-300** ​ ") IP address



​ ​ ​

​ ​
​ ​



​ ​ ​

​ ​
​ ​


Page 21 / 28



​ ​ ​

​ ​
​ ​


​ ​ ​
​



**BGP** is a protocol used to exchange routing information between networks on the Internet. It is
used to determine the most efficient way to route data between independently operated
networks, or **Autonomous Systems** ​ . As such, **BGP** ​ is commonly used to **find a path to route data** ​
from ISP to ISP. It is important to note that **BGP** ​ is not used to transfer data, but rather to
**determine the most efficient routing path** .


Page 22 / 28


​ ​

​


​ ​ ​ ​


## **Partial Route Hijacking**

From the ticket section, we know that there is a user on **AS-200** ​ trying to connect to a **FTP** ​ server

on the **10.120.15.0/24** ​ network.


​ ​ ​ ​



​ ​

​


​ ​ ​ ​



​ ​

​


Since **AS-300** ​ is advertising routes for **10.120.15.0/24** ​, we **advertise a route** ​ with better **BGP** ​



​ ​

​


​ ​ ​ ​

**metrics**, in order for it to supersede the other routers and for them to add the entry to their



​ ​

​


​ ​ ​ ​


respective routing tables.



​ ​

​


​ ​ ​ ​


Page 23 / 28


​ ​ ​


​ ​ ​ ​

​



​ ​ ​


​ ​ ​ ​

​



In order to **hijack prefixes** ​ owned by other originating **ASes** ​ and get the **plaintext FTP** ​


​ ​ ​ ​

​



​ ​ ​

**credentials** of that user, we'll need to advertise a better route path to the other autonomous

​ ​ ​ ​

​



​ ​ ​


systems stating that we, as **r1** ​ (" **AS-100** ​ ") with an assigned IP address of **10.120.15.10** ​ ("I **P** ​

​



​ ​ ​


​ ​ ​ ​

**Hijacking** "), know how to reach that destination, we'll try the following **prefix hijacking** ​ method:



​ ​ ​


​ ​ ​ ​

​



​ ​ ​


​ ​ ​ ​

​


Page 24 / 28


## ​ ​

​

​

​


## Same Path : More Specific Prefix Length ​ (" /25 ​ ") Wins **Unintended Way**

​

​

​


## ​ ​

​

​

​


## ​ ​

Since all the hosts in this network are running on the same actual machine, because of **dynamic** ​

​

​


## ​ ​

​

**routing** it will automatically advertise local routes, so just adding the IP address of the **FTP** ​ server

​


## ​ ​

​

​

will do the trick, without having the need to perform any kind of **BGP Hijacking** ​ :


## ​ ​

​

​

​


Page 25 / 28


​ ​



​ ​



Now let's try mimicking the way a **FTP** ​ server responds, so the user can spew the **credentials** ​ we

want.


Page 26 / 28


​ ​ ​

​ ​ ​

​ ​

​ ​

​



​ ​ ​

​ ​ ​

​ ​

​ ​

​



**root:BGPtelc0rout1ng**

## **Complete Route Hijacking**


​ ​ ​

​ ​ ​

​ ​

​ ​

​



We can tag the routes sent to **r2** ​ with a **BGP** ​ community attribute called **no-export** ​, to tell the

​ ​ ​

​ ​

​ ​

​



​ ​ ​

router **not to re-advertise the routes** ​ . This way, **r2** ​ will send traffic through **r1** ​ but the advertised

​ ​

​ ​

​



​ ​ ​

​ ​ ​

route won't be sent to **r3** ​, for example when **r3** ​ receives traffic from us, it will correctly route it on

​ ​

​



​ ​ ​

​ ​ ​

​ ​

the local connected interface where the **FTP** ​ server is, this way we can perform **MITM** ​ and steal

​



​ ​ ​

​ ​ ​

​ ​

​ ​

the plaintext **FTP** ​ credentials.



​ ​ ​

​ ​ ​

​ ​

​ ​

​


Page 27 / 28


Page 28 / 28


