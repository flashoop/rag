# Smasher

*Converted from: Smasher.pdf*

---

# Smasher
## **14 [th] July 2018 / Document No D18.100.28**

**Prepared By: MinatoTW**

**Machine Author: dzonerzy**

**Difficulty: Insane**

**Classification: Official**



Page 1 / 23


## **SYNOPSIS**

Smasher is a very challenging machine, that requires exploit development, scripting, source code

review and Linux exploitation skills. A vulnerable web server is found to be running, which can be

exploited to gain a shell using ROP. A program running on a port locally is vulnerable to padding

oracle and can be exploited to gain sensitive information. After logging in, the user is found to

have access to a SUID file which can be exploited due to a race condition.


## **Skills Required**


  - Knowledge of source code review and

fuzzing techniques

  - Knowledge of reversing techniques

  - Intermediate Python skills


## **Skills Learned**


  - Binary file fuzzing

  - Exploit development

  - Binary file reversing

  - Padding Oracle exploitation



Page 2 / 23


## **ENUMERATION**





Nmap reveals that SSH is available, as well as "shenfeng tiny-web-server" running on port 1111.

## **FILE INCLUSION**


After a quick search online we find the source code on github. Looking at the issues we find

there’s a file inclusion vulnerability.


Page 3 / 23


After requesting /../../../../../etc/passwd we receive the contents of the passwd file.



Page 4 / 23


Download the source code, and then download the original repository to diff the code.





We see that code on the box (left) was edited to remove the loop which creates child processes.

This will help us stay on the parent process and exploit it.


Page 5 / 23


## **EXPLOIT DEVELOPMENT**

Looking at the binary properties using checksec:


We see that NX is disabled which we already know from the makefile and PIE is turned off too

which leads to constant addresses within the binary. As ASLR is turned on by default on Linux

we’ll assume that it’s active on the box.

## **FINDING THE CRASH**


Looking at the source code, the main() function calls the process function after setting up all the

variables.


Page 6 / 23


The process() function creates a child process for each request and then calls parse-request with

a http_request struct.


Looking at the definition of the http_request object we see that it contains a buffer for the

filename and markers for offset and end.


The parse_request() function ends up calling url_decode() with the requested filename and

MAXLINE which is defined as 1024 bytes,


The url_decode() function copies 1024 bytes of data into the filename buffer, which is just 512

bytes in size.


Page 7 / 23


This leads to a buffer overflow which will let us control the RIP. Let’s verify this using gdb. Set

follow-fork-mode to child to keep track of the fork process.





We see that it received a Segmentation fault and crashed.



Page 8 / 23


Let’s calculate the offset to overwrite now. Generate a pattern now using msf-pattern_create.

Restart the program and send a request:





After the crash, looking at the RSP value:


And we see that the offset is 568 which is the space we have for our payload. This can be

verified by sending extra B’s at the end.


With this information we can start constructing our ROP chain. The first step would be to leak the

address of libc.


To achieve this we’ll use the puts or write syscall depending on which is available in the binary.


Page 9 / 23


We see that puts isn’t present but write is. Looking at it’s man page we see that it takes in three

arguments.


The file descriptor, the buffer and the size to print. In 64 bit assembly the syscalls are made using

registers where RAX stores the syscall number, RDI stores the first argument, RSI stores the

second, RDX the third and so on. In order to store the required values in these registers we’ll use

the POP instruction. A POP instruction pops the top of the stack in the required register. For

example: POP RDI would place the value from the top of the stack into RDI.


First we’ll set RDI to 4, because by default the fd is 3 and is incremented on each request. We’ll

need a POP RDI to achieve this. The ropsearch command in peda helps us find the instruction.


Page 10 / 23


We can choose any one of the above as long as it doesn’t have null bytes in between. The next

argument we need is the address to be printed. We’ll print the address for the read syscall. Let’s

find it first using objdump.


It’s address is found to be 0x603088. The second argument is to be placed in RSI. This can be

achieved using a POP RSI instruction.


We find that POP RSI isn’t available on it’s own but we have POP RSI; POP R15 available and

because we don’t care about R15 it can be set to anything. As for the last argument, it can be

safely ignored.


The first part of our exploit can now be constructed.


Page 11 / 23


The script uses pwntools to send the request through the socket. As discussed earlier, our ROP

chain consists of POP RSI followed by address for read, and some junk for r15 followed by POP

RDI which pops the file descriptor. We’ll use urllib.quote to make it properly URL encoded. Now

running the script should leak the address for read@GOT.


Now using this we can find the libc offset which is randomised each time the server is restarted.

First download libc from the box.





Page 12 / 23


Using readelf we can find the address for the read function.


The address is found to be 0x0f7250. This can be used to calculate the base address for libc.





Now we need to find the offsets for system function and the string “/bin/sh”.


Adding this to the exploit code:





Now, in order to get the output of our commands we’ll use the dup2 syscall which will duplicate

the existing file descriptor.


Find its address in libc.


Page 13 / 23


We\ll duplicate the stdin and stdout file descriptors which is equivalent to:





Once again we can use POP RSI and POP RDI to place arguments.

## **FOOTHOLD**


Using all the above information we can construct out final ROP chain and exploit.



Page 14 / 23


Page 15 / 23


As discussed earlier our second ROP chain duplicates the stdin and stdout fd’s and executes

/bin/sh. Running the exploit gives us a shell as www.


Page 16 / 23


## **LATERAL MOVEMENT**

Looking at the listening ports locally we see that a 1337 is active.


To easily interact with it we can run socat and forward the port to all interfaces. A static binary for

socat can be found [here. Download it and transfer it to the box.](https://github.com/andrew-d/static-binaries/blob/master/binaries/linux/x86_64/socat)





And now we can directly connect it via port 5555 on the box.





The program is some kind of “AES Checker” which provides ciphertext and expects some

ciphertext. Sending an empty value it responds with “Generic error”.


Page 17 / 23


Sending the same ciphertext, we receive “Hash is ok”.


Sending it different kinds of values we receive an “Invalid padding” error for 64 A’s.


This can be concluded as a type of padding oracle attack where we can decrypt the blocks by

checking if the padding is correct or not. This can be achieved using the python [paddingoracle](https://github.com/mwielgoszewski/python-paddingoracle)

library.





And then create the following script:



Page 18 / 23


The script uses the paddingoracle library to send encrypted values to the program and tries to

decrypt it based on the error message. Execute it with the encrypted ciphertext as the argument.





Page 19 / 23


The script takes a while to decrypt all the blocks.





After which we received the password for the user smasher as “PaddingOracleMaster123” which

can be used to login via SSH.


Page 20 / 23


## **PRIVILEGE ESCALATION**

Enumerating the SUID files on the box we come across a binary named checker.


Running the binary needs some arguments which seems to be filenames.


We create a file and add some contents in it and then run the binary.





We see that it just prints out it’s contents along with the owner’s uid.



Page 21 / 23


NOTE - The script encounters issues when executed from the /tmp or /dev/shm directories.

However, it remains functional when initiated from directories such as /home/smasher and other

locations within the host’s filesystem. To clarify, it is permissible for the script to be located in /tmp

or /dev/shm; the crucial point is to ensure that /tmp or /dev/shm is not designated as the active

working directory during script execution.


Running strace on the binary we see that it checks if we have permissions to read the file or not.





Page 22 / 23


Page 23 / 23


