# Safe

*Converted from: Safe.pdf*

---

# Safe
## **25 [th] October 2019 / Document No D19.100.49**

**Prepared By: MinatoTW**

**Machine Author: ecdo**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 19


## **SYNOPSIS**

Safe is an Easy difficulty Linux VM with a vulnerable service running on a port. The binary is found

to be vulnerable to buffer overflow, which needs to be exploited through Return Oriented

Programming (ROP) to get a shell. The user’s folder contain images and a keepass database

which can be cracked using John the ripper to gain the root password.


## **Skills Required**


  - Enumeration

  - Exploit Development


## **Skills Learned**


  - ROP

  - Cracking keepass databases


Page 2 / 19


## **Enumeration** **Nmap**





We see SSH and Apache running on their default ports, as well as an unidentified service running

on port 1337.

## **Apache**


Browsing to port 80 we come across the default HTTP page. Looking at the page source a

comment can be seen at the top.


Page 3 / 19


It says the binary running on port 1337 can be downloaded from the web server. Let’s download

and analyze it before proceeding.

## **Exploit Development**

The binary “myapp” is a 64 bit ELF executable.


On running the binary, we see that it just echoes back the input. Let’s open it up in GDB to look at

the functions.

We’ll use the [GEF​](https://github.com/hugsy/gef) plugin with GDB. Use the following command to install it locally.​


Page 4 / 19


Once installed, open the binary in GDB.


Apart from the default functions, we see that the binary has imported the system() function, which

will help us execute system commands. The binary also uses the gets() function which is

vulnerable to buffer overflows. There are two user defined functions where main is the default

starting point, along with an additional function test(). We can look at the binary protections using

the checksec command.


As NX (No-eXecute) is enabled, we’ll have to use a ROP ( Return oriented programming) based

approach to exploit the buffer overflow. Let’s look at the disassembly of the main function.


Page 5 / 19


We see that the binary loads a buffer [rbp-0x70] i.e 0x70 bytes in size into rax and then moves it

to rdi. The 64 bit assembly uses registers for calling functions. The RDI register is used for the

first argument, RSI for the second, RDX for the third and so on. RDI is loaded with a buffer of size

0x70 i.e 112 bytes, the binary calls gets() to save user input into it and then uses puts to print the

contents of the buffer. So, ideally we should be able to overflow the buffer with input greater than

112 bytes. Let’s try sending 120 bytes and check if we could overwrite RBP.


First create an input of 120 bytes, where the first 112 bytes are A’s and the rest 8 are B’s.


Now, let’s check if we have overwritten RBP.


Page 6 / 19


From the output we see that RBP contains “BBBBBBBB” which means we can overflow the buffer

with 120 bytes. We can now control RIP with the bytes after 120.


Let’s look at the disassembly of the “test” function now.


The function moves RSP to RDI and jumps to the address present in R13.


We can use this to our advantage by setting R13 to the address of the system() call. RSP points to

the top of the stack, which can be controlled by our input. As mentioned, x64 uses the RDI


Page 7 / 19


register for the first argument. This will let us place the address to “/bin/sh” in RDI and then jump

to the system call using R13.


To place the address of the system call into R13 a “pop r13” gadget is needed. The POP

instruction moves the top of the stack into the specified register. We can use ropper in order to

find such a gadget.


It found a gadget for “pop r13; pop r14; pop r15; ret;” at the address 0x0401206. We can now start

creating our ROP chain using pwntools.





Page 8 / 19


This is the first part of the chain, where we pop the address to the system call into the R13

register. Additionally, there has to be some junk on the stack to pop into the R14 and R15

registers, for which the script uses B’s and C’s. Run the script, directing the output to a file, and

then use GDB to send this as input to the binary.


The program crashes and we’ll see the desired address present in R13, as well as B’s and C’s

present in R14 and R15 registers respectively.


After placing the address into R13, we can call the test function. The test function moves the

address for RSP to RDI. We can place “/bin/sh” into RSP so that it’s copied to RDI, and then

system is called with RDI as the argument.


Here’s the modified script:





Page 9 / 19


The address for test can be found using objdump or GDB. We need to terminate “/bin/sh” with a

null byte as C considers strings as a sequence of characters terminated by a null byte. We place

the binsh string at the top of the stack so that it’s address gets moved to RDI.


Page 10 / 19


Execute it and redirect the output to a file again. We can add a breakpoint at the MOV

instructions to view the flow of the chain.


After the first breakpoint is hit, we can see that RSP points to the “/bin/sh” string. Now enter “si”

to step an instruction.


Page 11 / 19


We see that RDI now points to the buffer with “/bin/sh”. Stepping again the code should jump to

the system call.


The chain jumped to the system call, and GDB guessed the arguments for RDI (pointing to our

string) and RSI (pointing to the return address). RDI can be anything and is called only after

exiting.


Page 12 / 19


## **Foothold**

Let’s run the exploit locally to see if it worked.


The chain was successful and we were able to pop a shell. Let’s modify the script to send this

payload to the server.





Page 13 / 19


We create a connection to port 1337 on the box and send the payload using the sendline()

function. Then the interactive mode is turned on to interact with the shell.


The exploit was successful and we were able to get a shell as the user “user”.


Page 14 / 19


## **Privilege Escalation**

Navigating to the user’s home folder, we see a KeePass database and a few images.


We can copy our public key to authorized_keys, so that we can SSH into the box.



Page 15 / 19


We have successfully upgraded our shell.


Looking at the images we can assume that one of them is a key to the KeePass database.

Transfer all the images and KeePass database using SCP.


We can generate hashes for each image using keepass2john and try to crack them. The -k

parameter in keepass2john can be used to specify the keyfile. The following bash script will

append hashes to a file.





Page 16 / 19


We can use John The Ripper along with rockyou.txt to crack the hashes.


The password was cracked as “bullshit”. But we don’t know the name of the keyfile this is valid

for. We can create a script using kpcli to find the image. Kpcli is a command line interface for

KeePass and can be installed using apt.


The following script will try to open the db using each file and returns the filename if the exit code

is equal to 0 (i.e. success).





Page 17 / 19


The password is echoed through stdin, while output and errors are directed towards /dev/null. If

the exit status is 0, the script breaks and prints the key.


The key is found to be IMG_0547.JPG. This can be used with kpcli to open the database.


Page 18 / 19


Upon entering, we see an item named “MyPasswords”, getting into it and listing again an entry

for root password is present. This can be viewed using the show command. We can now use the

root password to su and get the flag.


Page 19 / 19


