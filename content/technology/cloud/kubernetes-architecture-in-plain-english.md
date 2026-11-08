---
id: tech-kubernetes-plain-english
title: "Kubernetes Architecture in Plain English"
summary: "Kubernetes is a group of small, independent \"watch and fix\" loops that all talk through one central front desk."
minutes: 32
source: "https://claude.ai/artifact/MY3Fm7TCcFfaMSDko7Pham"
---
Kubernetes is a group of small, independent "watch and fix" loops that all talk through one central front desk. Three ideas carry everything in this guide: **desired state**, the **reconciliation loop** and **hub-and-spoke** communication. You will meet each one below.

I will go slowly and use short sentences. Every technical term stays exactly as it is. The first time I use a term, I explain it inside parentheses ( ) in very simple words.

Each section has a diagram. The **Deep intuition** boxes give you the reason behind each fact, so you can defend it when someone challenges you. I checked the facts against Kubernetes v1.37, the latest release.

## Part 1: The Problem First (So the Solution Makes Sense)

You cannot run many programs on many computers by hand, so you need an automatic manager.

Imagine you have 10 computers. We call each one a **node** (a single machine, physical or virtual, that can run programs). You also have 50 programs. We call each one a **container** (a small, packaged box that holds one program and everything it needs to run).

You want four things:

- Each program is always running.
- If a program crashes, it restarts by itself.
- If a computer dies, its programs move to another computer.
- If you need more copies of a program, you get them easily.

Doing this by hand is impossible. Nobody can watch 10 computers and 50 programs every second. So you need a manager: a system that watches everything and fixes problems automatically.

**Kubernetes** (a system that manages containers across many computers) is that manager.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Kubernetes stands between your wish and your machines<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

You write the wish once. When Node 2 dies, Kubernetes moves its work, and you do nothing.

## Part 2: The One Core Idea: Desired State

Kubernetes keeps comparing what you asked for with what is really there, and it fixes any difference. This is the most important idea in all of Kubernetes. If you understand only this, you understand 80% of it.

You write down what you want. For example: "I want 3 copies of my web program running." This written wish is the **desired state** (the situation you want to be true). How many copies are really running right now is the **actual state** (the situation as it truly is at this moment).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The reconciliation loop, with a simple example<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Kubernetes runs this loop forever, without stopping:

1. Read the desired state (what you asked for).
2. Look at the actual state (what is really there).
3. If they are different, do something to fix it.
4. Repeat.

This "compare and fix" loop is called **reconciliation** (the act of making reality match your wish, again and again). This style is called **declarative** (you declare your wish, and the system works out the steps).

**Simple analogy:** A **thermostat** (a device that controls room temperature). You set it to 22°C. You do not tell it how to heat the room. It just keeps checking: "Is it 22? No? Then heat. Is it 22 now? Yes? Then stop." Kubernetes is a thermostat for your programs.

> **Deep intuition:** Kubernetes acts on how things are now, not on a list of past events. This is called **level-triggered** (reacting to the current state) rather than **edge-triggered** (reacting only at the moment something changes). So a missed message is not a disaster. The next loop sees the difference and fixes it anyway.

Remember this loop. Every component you will meet is a worker that helps to run it.

## Part 3: The Two Halves of Kubernetes

Kubernetes splits into one half that decides and one half that does the work.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The two halves and the components inside each one<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

The **control plane** (the set of components that decide and coordinate) stores your wishes and assigns work. The **data plane** (the set of worker machines that run your programs) carries out that work.

In a normal production cluster, your programs do not run on the control plane machines. The data plane makes only small local decisions, such as restarting a crashed container. The next parts explain every component, one by one.

## Part 4: Control Plane Components (The Brain)

The control plane has five components, and each one has a single clear job. Together they keep the loop from Part 2 running.

### 4.1 etcd: The Memory

**etcd** (a distributed database that stores all of Kubernetes' wishes and facts) is the only source of truth in the cluster.

It is a **key-value store** (a simple database that saves pairs of "name → value", like a dictionary: "colour" → "blue"). The reconciliation loop needs a memory. If the system forgets what you wanted, it cannot fix anything. So every object in Kubernetes, meaning every wish you write, is saved here.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> How Raft and quorum protect a write in a 3-machine etcd cluster<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Five words to know:

- **Distributed** (copied across many machines, so it does not die if one machine dies).
- **Consistent** (all copies agree on the same answer, with no confusion).
- **Raft** (a voting method that computers use to agree on one truth, like a committee voting).
- **Quorum** (a majority, meaning more than half). In Raft, a write is accepted only when a quorum of machines have saved it.
- **Linearizable** (when you read, you always see the most recent write, never old data).

> **Deep intuition:** etcd is not a **cache** (a temporary copy). It is the truth. If you lose etcd, your running containers do not stop at once, but Kubernetes forgets what should exist. This is why backing it up is the most important job in Kubernetes operations.

> **Deep intuition:** This is why etcd clusters use odd numbers. With 3 machines, the quorum is 2, so 1 can die. With 4 machines, the quorum is 3, so still only 1 can die. The fourth machine adds cost, not safety.

**Critical rule:** Only the kube-apiserver talks to etcd. No other component touches it. This is a deliberate **choke point** (a single narrow path that everything must pass through, so it is easy to control and watch).

### 4.2 kube-apiserver: The Front Desk

The **kube-apiserver** (the central receptionist that everyone must speak to) is the only door into Kubernetes.

It is a **REST API server** (a program that accepts requests over the network in a standard web style, like a website that accepts form submissions). The scheduler, the controllers and the kubelet on every node all talk to it. Only the kube-apiserver talks to etcd.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The kube-apiserver request path, from your request to etcd<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

1. **Authentication** (proving who you are, like showing your ID at the door).
2. **Authorization** (checking if you are allowed, like checking if your ID opens this room). This often uses **RBAC** (Role-Based Access Control: rules that say "who can do what").
3. **Admission control** (a checkpoint that can change or reject your request, like a security guard who inspects your bag). It can call a **webhook** (a URL the system calls to ask "should I allow this?", like phoning a manager for approval).
4. **Validation** (checking the request is legal and well-formed, like checking a form is filled in correctly).
5. **Persistence** (saving the request to etcd, like writing it in the notebook).

A small but true detail: admission runs in two parts. **Mutating admission** (the part that can change a request) runs before validation. **Validating admission** (the part that can only accept or reject) runs after it.

> **Deep intuition, why it is stateless:** **Stateless** means it keeps no lasting memory of its own between requests. All lasting memory is in etcd, and any cache in the API server is only a copy for speed. So you can run many copies at once, and they all behave the same. This is how Kubernetes achieves **high availability** (staying up even if some parts fail).

> **Deep intuition, the watch:** Components do not keep asking "anything new?" That asking is called **polling** (repeatedly asking). Instead, they open a **watch** (a long-lived subscription, like subscribing to a YouTube channel). The API server pushes updates to them at once, so the whole system reacts quickly without wasting work.

**Mental model:** The kube-apiserver is a **hub-and-spoke** switchboard (a central telephone operator: every caller connects to the operator, and no caller connects directly to another caller).

### 4.3 kube-scheduler: The Matchmaker

The **kube-scheduler** (the component that picks a node for each new Pod) only makes a decision. It starts nothing.

It watches for **Pods** (the smallest unit in Kubernetes: a wrapper around one or more containers that run together on one node) that have no node yet. Then it works in two phases.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The two scheduling phases and the single output<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

- **Phase 1: Filtering** (removing nodes that cannot run this Pod). It checks hard rules. Does the node have enough CPU and memory? Does the node have a **taint** (a mark that repels Pods, like a "wet paint" sign) that the Pod does not **tolerate** (have permission to ignore)? Does the node break a required **affinity** (a wish to be near something) or **anti-affinity** (a wish to be away from something)?
- **Phase 2: Scoring** (ranking the remaining nodes from best to worst). It gives points for things like spare capacity and an even spread across **zones** (separate data-centre areas). It also prefers a node that already has the **image** (the packed files a container starts from).

Then it does exactly one thing: it writes the chosen node's name into the Pod's record on the API server. It does not start anything, and it does not talk to the node.

> **Deep intuition, requests:** The scheduler plans with **requests** (the CPU and memory a Pod reserves in its description), not with live usage. So a node can look quiet on a chart and still be "full" to the scheduler. Think of a restaurant: a table is taken once it is booked, even if the guests have not arrived.

> **Deep intuition, pure decision:** The scheduler's only output is one field update: "this Pod goes to node-7." This is why you can replace it with your own custom scheduler. The contract is just "pick a node for each waiting Pod."

### 4.4 kube-controller-manager: The Room Full of Little Robots

The **kube-controller-manager** (one program that runs many small controllers) is where most of the watch-and-fix work happens. Each **controller** (a tiny reconciliation loop with one job) watches one type of object and keeps fixing it.

| Controller | What it keeps correct |
| --- | --- |
| Deployment controller | Reads each Deployment (your written wish for a program, such as its version and number of copies). Makes sure the right ReplicaSets exist. A **ReplicaSet** is a group that keeps N copies of a Pod running. It also handles **rollouts** (controlled updates to a new version). |
| ReplicaSet controller | Makes sure the right number of Pods exist. If you want 3, it creates or deletes Pods until there are exactly 3. |
| Node lifecycle controller | Watches the health of each node. If a node stops reporting, it adds a taint to that node. |
| Taint eviction controller | **Evicts** (removes) Pods from a tainted node, so replacement Pods can start on healthy nodes. By default, Pods wait 5 minutes first. |
| EndpointSlice controller | Fills in the lists of Pod IPs (network addresses) behind each **Service** (a stable address that points to a group of Pods). The older Endpoints API has been deprecated (marked for future removal) since v1.33. |
| Job controller | Makes sure a **Job** (a task that should run until it finishes, like a one-time batch job) runs to completion. |

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Independent workers react to notes on the API server<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

> **Deep intuition, the secret:** These controllers do not know about each other. The Deployment controller does not call the ReplicaSet controller. It writes a ReplicaSet to the API server, and the ReplicaSet controller reacts. This is **composition** (small independent pieces combining into a big system). The intelligence is **emergent** (it appears from many simple parts working together, and no single part is smart).

**Why this matters:** This is how you extend Kubernetes. You write a **CRD** (Custom Resource Definition: a way to add your own new object type) and a controller for it. This pattern is called an **operator** (a custom controller that manages a custom resource, like a specialised robot for your own application).

### 4.5 cloud-controller-manager: The Cloud Translator

The **cloud-controller-manager** (an optional component that talks to a cloud provider) handles the jobs that only the cloud can do.

A **cloud provider** is a company that rents you computers over the internet, like AWS, Google Cloud or Azure. This component runs three main controllers:

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The three cloud controllers and what each one reaches<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

- **Node controller:** Asks the cloud about each server, such as its ID, region and network addresses. If a server was deleted from the cloud, it removes that Node from the cluster.
- **Route controller:** Sets up cloud network routes, so containers on different nodes can reach each other.
- **Service controller:** Creates a **load balancer** (a traffic distributor that spreads requests across many machines) when a Service asks for one.

It does not manage **autoscaling** (automatically adding or removing machines). Separate tools, such as Cluster Autoscaler and Karpenter, do that job.

> **Deep intuition:** This exists so the core Kubernetes code stays **cloud-agnostic** (does not depend on any one cloud). All cloud-specific logic lives here. It is an **adapter** (a translator that lets two different systems talk). It also lets each cloud release features at its own speed.

## Part 5: Worker Node Components (The Hands)

Every worker node runs three components, and they turn decisions into running programs.

### 5.1 kubelet: The Node Supervisor

The **kubelet** (the main agent that runs on every worker node) turns a Pod's description into running containers, then reports back. It is the only component that tells the node to start containers.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The kubelet is a two-way bridge between the control plane and the node<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

What it does:

1. Watches the API server for Pods assigned to its node.
2. Mounts **volumes** (attaches storage to the Pod).
3. Injects **Secrets** (private data like passwords) and **ConfigMaps** (non-private settings) into the Pod.
4. Tells the **container runtime** (the program that actually creates and starts containers, like containerd or CRI-O) to pull the image and start the container.
5. Runs health **probes** (checks):
   - **Liveness probe:** "Are you alive?" If not, the kubelet restarts the container.
   - **Readiness probe:** "Are you ready to receive traffic?" If not, the Pod is removed from the Service.
   - **Startup probe:** "Did you start correctly?" This gives slow-starting apps extra time.
6. Reports back to the API server: **node conditions** (the health report of the machine) and **Pod status** (what each Pod is doing).

> **Deep intuition, two-way bridge:** The kubelet translates intent (the **PodSpec**: the Pod's description) into reality, and it reports reality back up. If the kubelet stops reporting, the control plane notices and moves the work. The loop heals itself.

> **Deep intuition, two levels of healing:** If one container crashes, the kubelet restarts it on the same node, with no help from the control plane. If a whole node is lost, the controllers create replacement Pods elsewhere. Small problems are fixed locally. Big problems go up one level.

### 5.2 kube-proxy: The Traffic Rule Writer

**kube-proxy** (a component on every node that makes Services work) writes traffic rules, then steps aside.

A Service gives your Pods a fixed address, even though Pods come and go and their IPs change. kube-proxy watches Services and **EndpointSlices** (the lists of Pod IPs behind a Service). Then it writes **kernel** rules (instructions inside the kernel, the lowest-level core of the operating system).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Setup path from top to bottom, traffic path from left to right<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

| Mode | How it works | Status |
| --- | --- | --- |
| iptables | Programs **iptables** (a Linux firewall rule system). The kernel rewrites the destination of traffic to one Pod IP. This rewriting is **DNAT** (Destination Network Address Translation: changing the destination address of a packet). | Supported |
| nftables | Uses **nftables** (the modern replacement for iptables). It solves the speed problems of iptables at large scale. | Supported and recommended over IPVS |
| IPVS | Uses **IPVS** (a load balancer built into the Linux kernel). | Deprecated in v1.35. The current plan is off by default in v1.40 and removed in v1.43 |

> **Deep intuition:** In these modes, kube-proxy is a rule compiler, not a proxy. It does not sit in the traffic path. It writes rules, and the kernel does the work. So if kube-proxy stops, existing rules keep working, but new changes do not arrive. In some setups, **eBPF** (a way to run small safe programs inside the kernel) replaces kube-proxy entirely, for example with Cilium.

### 5.3 Container Runtime: The Engine

The container runtime is the software that actually creates and runs containers. The common ones are **containerd** and **CRI-O**.

The word "runtime" hides two levels:

| Level | Examples | Job |
| --- | --- | --- |
| High-level runtime | containerd, CRI-O | Pulls images, prepares storage, supervises containers |
| Low-level runtime | runc, crun | Asks the kernel to build the container |

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The containerd path, from the kubelet down to the kernel<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

> **Deep intuition:** A container is not a small computer. It is a normal Linux process with walls around it. **Namespaces** (walls that limit what a process can see) and **cgroups** (limits on how much CPU and memory a process can use) build those walls. All containers on a node share one kernel, which is why they start so quickly.

### 5.4 The Three Plugs: CRI, CNI and CSI

Kubernetes itself does not know how to run a container, connect a network or attach a disk. It only knows how to ask, through three standard plugs. This is why Kubernetes is a **platform** (a base that others can build on), not a fixed product.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Where each of the three plugs sits<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Look at the left side of the picture: the container runtime calls CNI, not the kubelet.

| Plug | Question it answers | Who calls it | Examples |
| --- | --- | --- | --- |
| CRI, Container Runtime Interface | How does a container run? | kubelet | containerd, CRI-O |
| CNI, Container Network Interface | How does a Pod reach others? | Container runtime | Calico, Flannel, Cilium |
| CSI, Container Storage Interface | Where does the data live? | kubelet and CSI helpers | EBS, Ceph, NFS drivers |

> **Deep intuition, why plugs exist:** Think of a phone charging socket. The phone does not care who made the charger, only that it fits. In the early days, Docker code sat inside the kubelet, and storage code sat inside Kubernetes. Every vendor change was tied to a Kubernetes release. With plugs, the core stays small and each vendor moves at its own speed.

#### CRI in depth: how a Pod really starts

**CRI** (Container Runtime Interface: a standard plug, so the kubelet can talk to any container runtime, not just one) is a short list of orders that the kubelet can give.

The kubelet is the client, and the runtime is the server. They use **gRPC** (a fast way for programs to call each other) through a local **Unix socket** (a private channel between programs on the same machine). CRI has two parts:

- **RuntimeService:** Runs and stops Pod sandboxes and containers.
- **ImageService:** Pulls, lists and removes images.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The order of CRI calls when a Pod starts<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

> **Deep intuition, two worlds meet:** Above the kubelet, the world is declarative: "this Pod should exist." Below the kubelet, it is **imperative** (giving exact orders, one step at a time): "run the sandbox, pull the image, start the container." The kubelet is the translator between these two worlds.

> **Deep intuition, a Pod is a shared home:** The **Pod sandbox** (the shared environment that a Pod's containers live in) is built first. A tiny **pause container** (a container that does almost nothing except keep the shared namespaces alive) holds it open. Your containers then join it. So a container can crash and restart while the Pod keeps its IP. It is also why two containers in one Pod share one set of ports and can clash.

Two standards are easy to mix up:

| Standard | Between | What it defines |
| --- | --- | --- |
| CRI | kubelet and high-level runtime | The orders, such as "run this sandbox" |
| **OCI** (Open Container Initiative: open standards for containers) | Image builders, runtimes and runc | The image format and how to run a container |

This design gave Kubernetes two real benefits:

- **Docker is not required.** Kubernetes v1.24 removed **dockershim** (the adapter that let the kubelet talk to Docker Engine). Images built with Docker still work, because they follow the OCI format.
- **A Pod can choose its walls.** **RuntimeClass** (a Kubernetes object that picks which runtime a Pod uses) can select stronger isolation. **gVisor** puts a small replacement kernel between your program and the real kernel. **Kata Containers** runs containers inside lightweight virtual machines (small computers simulated by software).

#### CNI in depth: how a Pod gets its network

**CNI** (Container Network Interface: a standard way to give a Pod its network) makes the Kubernetes network rules true.

Kubernetes sets the rules, but it does not build the network:

- Every Pod gets its own IP address.
- Pods can reach Pods on other nodes without **NAT** (rewriting addresses on the way).
- Containers in one Pod share one IP and one set of ports.

A **CNI plugin** (the program that builds this network) is called by the container runtime. The runtime starts it with a simple command: `ADD` to connect a Pod, `DEL` to disconnect it. Many plugins also keep a helper agent running on each node.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The path between two Pods on different nodes<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

During `ADD`, the plugin works inside the Pod's **network namespace** (a private copy of the network: its own interfaces, IPs and routes). It often connects that namespace to the node with a **veth pair** (a virtual network cable with two ends). It gets an IP from **IPAM** (IP Address Management: the part that hands out addresses). Between nodes, traffic uses normal routes, the cloud network or an overlay (a virtual network built on top of the real one).

> **Deep intuition, CNI and kube-proxy:** CNI gives every Pod an address and a road to every other Pod. kube-proxy gives a group of Pods one stable address on top of those roads. They solve different problems, so do not mix them up.

> **Deep intuition, reading failures:** The sandbox cannot finish without a network. So a broken CNI plugin often shows up as Pods stuck in `ContainerCreating`. The error talks about the sandbox network, not your application.

**One more plug story:** **NetworkPolicy** (rules for which Pods may talk to which) is defined by Kubernetes, but enforced by the network plugin. If your plugin does not support it, your rules do nothing.

#### CSI in depth: how a Pod gets its disk

**CSI** (Container Storage Interface: a standard way to connect storage to Kubernetes) lets any storage system work with Kubernetes, with no vendor code inside Kubernetes.

Storage has two kinds of work, so a CSI driver has two parts:

| Part | Where it runs | Job |
| --- | --- | --- |
| Controller plugin | Usually a Deployment, anywhere in the cluster | Talks to the storage system: creates, deletes and attaches disks |
| Node plugin | A **DaemonSet** (one copy on every node) | Prepares and mounts the disk for Pods on that node |

A Pod asks for storage through a **PersistentVolumeClaim** or **PVC** (a written request for storage, like "I need 10 GB").

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The usual CSI path for a disk that attaches to a node<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Some drivers skip steps. NFS, for example, has no disk to attach. The kubelet talks to the node plugin with gRPC over a Unix socket, just like CRI.

> **Deep intuition, the same loop again:** external-provisioner and external-attacher are **sidecars** (small helper containers that run beside a main container). They are really just controllers. They watch objects on the API server and turn them into CSI calls. So the storage vendor can focus on storage, and the loop from Part 2 does the rest.

> **Deep intuition, why the data survives:** A Pod is temporary, but its volume is not. When a Pod moves to a new node, the disk is detached, attached to the new node and mounted again. The program dies and returns. The data stays.

## Part 6: How They All Talk: The Hub-and-Spoke

This is the most important architectural fact: components coordinate only through the kube-apiserver, and only the kube-apiserver talks to etcd.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Hub-and-spoke communication in a Kubernetes cluster<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Why this matters, in plain words:

1. **Decoupling** (separating parts so they do not depend on each other): components can change without breaking each other.
2. **Security and audit** (a record of who did what): one door means one place to check and one place to log.
3. **High availability:** the API server keeps no lasting memory, so you can run many copies.
4. **Extensibility** (room to add new parts): new controllers just plug in by watching the API server.

**To stay accurate:** this rule is about coordination. A few direct paths exist for other jobs:

- The API server connects to the kubelet for logs, `exec` (running a command inside a container) and port-forwarding (opening a private tunnel to a Pod).
- The API server calls webhooks during admission.
- The kubelet talks to its local runtime through CRI.

Decisions and wishes still flow through the hub. If someone challenges you with these paths, you now have the full answer.

## Part 7: The Full Story: What Happens When You Deploy

One command starts nine independent reactions, and together they give you a running program that others can reach.

You run `kubectl apply` (a command that sends your wish to the cluster) with a Deployment file. Follow each step in order. The highlighted step is where your program finally runs.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> What happens after kubectl apply, in order<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Steps 7 to 9 need a Service object. A Deployment alone does not create one. In step 9, **CoreDNS** (a DNS server inside the cluster, which turns names into IP addresses) lets Pods find the Service by name.

> **Deep intuition, the pattern:** No component gave an order to another component. Each step was an independent **watch-and-react** (each component watched the API server and reacted on its own). The magic is composition, not **centralised control** (one boss telling everyone what to do).

## Part 8: The One-Page Summary

Kubernetes is a group of small, independent "watch and fix" loops. They never give each other orders. They all talk through one central front desk (the kube-apiserver), which saves everything in one notebook (etcd). The complexity you see is not one big brain. It is many simple parts working together.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The whole of Kubernetes on one picture<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

| Component | Job in plain English |
| --- | --- |
| etcd | The notebook where Kubernetes stores all your wishes. The only source of truth. |
| kube-apiserver | The front desk. The only door in. Checks who you are and what you may do, then saves your request. |
| kube-scheduler | The matchmaker. Decides which worker machine gets each waiting Pod. Does nothing else. |
| kube-controller-manager | A room full of little robots. Each robot watches one thing and fixes it if it is wrong. |
| cloud-controller-manager | The translator for cloud providers. Handles cloud-only tasks. |
| kubelet | The supervisor on each worker machine. Gives the order to start containers. |
| kube-proxy | The traffic rule writer. Makes Services work by writing kernel networking rules. |
| Container runtime | The engine that actually creates and runs containers. |
| CRI, CNI, CSI | The three standard plugs for running, networking and storage. |

If you remember nothing else, remember this: **desired state + reconciliation loop + hub-and-spoke communication**. Everything else is just a specific worker serving that pattern.

## Real-World Examples

These three situations show the ideas working together.

### Example 1: A server dies during a big online sale

An online shop runs 3 copies of its checkout program on 3 different nodes. In the middle of a sale, one node loses power.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> How a lost node heals, step by step<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

During the 5-minute wait, traffic goes to the two healthy copies. No single part "handled" the failure. Five workers each did one small job.

**The lesson:** This is the reconciliation loop in real life. It also shows why you run more than one copy. The other copies protect you while the loop does its work.

### Example 2: A coding website runs strangers' code

An online coding platform runs programs written by unknown users. A normal container shares its kernel with its neighbours, so this is risky. The team adds one line to the Pod: `runtimeClassName: kata`.

The kubelet still speaks CRI, exactly as before. The runtime now starts that Pod inside a lightweight virtual machine. The scheduler, the API server and the Service do not change at all.

**The lesson:** This is the power of a plug. You change one thing behind a standard socket, and the rest of the system does not notice.

### Example 3: A database moves to a new node

A small company runs a PostgreSQL database in a Pod on AWS. Its data sits on an EBS disk, requested through a PVC. The node fails, and a new Pod starts on another node in the same zone.

CSI detaches the disk, attaches it to the new node and mounts it into the new Pod. The database wakes up with all its data. This is not instant, so serious databases also keep replicas and backups.

**The lesson:** Pods are temporary, but volumes last. Keep your data outside the Pod's life.


## Sources

- [Kubernetes v1.37 release announcement](https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/)
- [Cloud Controller Manager](https://v1-35.docs.kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Taints and Tolerations](https://v1-35.docs.kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Communication between Nodes and the Control Plane](https://kubernetes.io/docs/concepts/architecture/control-plane-node-communication)
- [Continuing the transition from Endpoints to EndpointSlices](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [KEP-5495: Deprecate IPVS mode in kube-proxy](https://www.k8s.dev/resources/keps/5495/)
- [Introducing Container Runtime Interface (CRI) in Kubernetes](https://kubernetes.io/blog/2016/12/container-runtime-interface-cri-in-kubernetes/)
- [Dockershim Removal FAQ](https://kubernetes.io/blog/2022/02/17/dockershim-faq)
- [Chapter 16: Pod Networking Model, Containerd From The Bottom Up](https://thecontainerdbook.pages.dev/chapters/part-5/16-pod-networking-model)
- [CSI driver architecture, Deckhouse documentation](https://deckhouse.io/products/kubernetes-platform/documentation/v1/architecture/cluster-and-infrastructure/csi-driver.html)
