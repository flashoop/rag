# Ellingson

*Converted from: Ellingson.pdf*

---

# Ellingson
## **20 [th] June 2019 / Document No D19.100.39**

**Prepared By: MinatoTW**

**Machine Author: Ic3M4n**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 19


## **SYNOPSIS**

Ellingson is a hard difficulty Linux box running a python flask server in debug mode, behind a

nginx proxy. The debugger can be abused to execute code on the server in the context of the

user running it. The user is found to be in the adm group which has access to the shadow.bak

file, from which hashes can be gained and cracked, which allows for lateral movement. A SUID

binary is found to be vulnerable to a buffer overflow - but as ASLR and NX are enabled - a ROP

based exploitation needs to be performed to gain a root shell.


## **Skills Required**


  - Exploit development

  - Scripting


## **Skills Learned**


  - Python debugger RCE

  - ROP exploit



Page 2 / 19


## **ENUMERATION** **NMAP**




## **NGINX**

The nginx server is running a website with a company website on it.


The page requested was /index instead of /index.html which means there could be some sort of

alias or reverse proxy in play. Scrolling down and clicking on one of the article tabs we are taken

to an article.


Page 3 / 19


The page is using the path /articles/:id in order to index the articles and display them by their

number. Looking at the third article we find this paragraph:


According to it the words Love, Secret, Sex and God are most common in passwords. Let’s keep

this in mind for later.


Looking at the URL it’s possible that they’re stored in some sort of database. Let’s try injecting a

quote to see if it’s vulnerable.





We receive a “ValueError” from the flask server because the server was expecting an integer and

not a quote. This confirms that the nginx server is acting as a reverse proxy, redirecting requests

to a flask server.


Looking around we find a console icon at the extreme right of the error.


Page 4 / 19


Clicking on it provides a python console which can be used to debug code. This should be

turned off in deployment in order to prevent execution of malicious code. We can directly

execute python code on this console.

## **RCE THROUGH DEBUGGER**


Now that we can execute code we need to find a way to execute commands on the box. As this

is a debugger we can’t directly use the system() function to get output. In this case we can use

the subprocess.check_output() function to execute code and save it to a variable.





We see that we’re running as the user hal. Let’s check his home directory.



Page 5 / 19


We see the .ssh folder, let’s write our public key to the authorized_keys file so that we can login.





Once done we should be able to directly SSH in as hal.





Page 6 / 19


## **LATERAL MOVEMENT** **ENUMERATION**

Looking at the groups of the user we see that he is in the adm group.


This allows us to read some log files. Let’s check all the files readable by this group.





Among the results we see an uncommon file shadow.bak which is usually owned by root.

Looking at the file we see the hashes for the users.


Let’s copy the file locally to try and crack the hashes.


Page 7 / 19


## **CRACKING HASHES**

First copy the file using scp.





Now extract the hashes from it to crack with john.





Now we can crack them using john and rockyou.txt. From the enumeration earlier we have a hint

that the password could contain Love, Secret, Sex or God. Let’s create a subset wordlist using

these words from rockyou.





And then crack using this list.





The password for margo is cracked as “iamgod$08”.



Page 8 / 19


## **PRIVILEGE ESCALATION** **ENUMERATION**

We can login as margo with the password “iamgod$08”. Looking at the suid files on the box we

find an uncommon binary.


The binary is /usr/bin/garbage isn’t a standard binary. Let’s see what it does.


It’s asking for a password. Let’s use ltrace to track the library calls and see it uses strcmp or

something equivalent.


Page 9 / 19


We see it compares the uid of the user who executes the binary, so we won’t be able to execute

it as hal. Next it compares the entered password with the string “N3veRF3@r1iSh3r3!”. Let’s use

this to gain access to the application.


Using the password we get in and are given four options which, don’t seem to be of much use

and don’t take any input.


Let’s transfer it over using scp to analyze the binary.





Page 10 / 19


## **ANALYZING THE BINARY**

The binary is a 64 bit dynamically linked executable. Using checksec we see that NX is enabled

which results in a non-executable stack.


Let’s send 500 characters to the password input to see if it crashes the binary.





We see that it resulted in a segmentation fault. Let’s find the buffer space we have using gdb. We

can generate a pattern using msf_pattern-create.





Page 11 / 19


After the crash use “info registers” in gdb to view the contents of the registers.


We see that RBP contains a part of our pattern in hex. Copy this and use msf-pattern_offset to

find the offset.


We get a match at offset 128 which makes our buffer size 128 + 8 = 136 where 8 is the size of the
register. Going back to the box and checking ASLR we find that it’s turned on.





Page 12 / 19


​ ​



​ ​



This results in the change of the libc address each time the binary is loaded. This can be verified

using ldd 

We see that the address changes every time. In order to bypass this as well as NX we can use

ROP-based exploit development.

## **EXPLOIT DEVELOPMENT**


[As there is no PIC/PIE ​](https://en.wikipedia.org/wiki/Position-independent_code) enabled in the binary, the addresses for the functions in the PLT will remain ​

constant. We can use this to leak the address puts@got using a puts call and then determine the

offset using it.


Find the address for puts@plt and puts@got using objdump:



​ ​



​ ​



​ ​



​ ​



​ ​


Page 13 / 19


We receive the address for puts@plt as 0x401050 and puts@got as 0x404028. We can now use

these to call puts@plt with the argument as puts@got to leak the actual address of puts in libc. In

order to call puts we’ll first have to place the argument in the RDI register. This can be done with

a “pop rdi” gadget. To find this use ROPgadget.





The address for this gadget is found to be 0x40179b. Let’s use these to construct the first part of

our chain and leak the address. We can use the ssh function from pwntools to debug the binary

remotely.





Page 14 / 19


The exploit first creates an ssh connection to the box and then executes the binary. Once done, it

sends the ROP chain in order to leak the address using puts. Running this we see that the

address was leaked. Let’s extract it and save this to a variable.


After this we need to call main() to start the binary again and continue our ROP chain.





Page 15 / 19


After making the changes the script would look like:





It receives the leaked output, strips the new line and adds null bytes until the length of the

address is equal to 8.


Now that we have the leaked address we need to calculate the offset from puts@@glibc. First find

the address using readelf:





Page 16 / 19


We obtain the address as 0x809c0. Now we can calculate the offset by subtracting this from the

leaked address:





Using this offset the address for any function can calculated. We can use system() to execute

/bin/sh. For this, find the address for system in libc.





We get the address as 0x4f440, using which the address of system can be found.





Now we need to find the string /bin/sh in the binary. This can be achieved using strings:





We get the address as 0x1b3e9a. Putting all this together we can use pop rdi again to set /bin/sh

as the argument for system and execute it.


But this would result in an error because dash would drop the suid bit before executing, and we

wouldn’t receive a root shell. We can fix this by calling setuid(0) before executing it. Find the

address for setuid@glibc in a similar way as earlier.


Page 17 / 19


Now we can use this address to find the address for setuid, and call it with ‘0’ as the argument.

The final exploit would look like this:


Page 18 / 19


After the first chain the binary goes back to the main function where we send it the second chain.

It calculates the offset using the leaked address, and then finds the final address for system and

setuid using it. Then setuid(0) is called, after which /bin/sh is executed as root with

system(‘/bin/sh’).


We see that our uid is 0 and we are root.


Page 19 / 19


