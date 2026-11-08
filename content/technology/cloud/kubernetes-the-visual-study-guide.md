---
id: tech-kubernetes-visual-study-guide
title: "Kubernetes: The Visual Study Guide"
summary: "Kubernetes keeps reality matching what you asked for."
minutes: 83
source: "https://claude.ai/artifact/2QdgYcfFB77D8JmoEhGzf5"
---
Kubernetes keeps reality matching what you asked for. You describe what you want in a file, and the cluster (a group of computers working as one team) works non-stop to make it true.

This guide follows your course transcript chapter by chapter. The course was recorded on Kubernetes 1.17, so each chapter also says what has changed, and ends with true stories from real companies.

## The big picture

One idea explains almost every component: Kubernetes puts something stable in front of something that keeps changing. Once you see this pattern, the system stops feeling like a long list of names.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The whole cluster on one page<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

The drawing shows two ways in. You send commands to the API server (the front door for all instructions). Users send requests to Ingress (the front door for web traffic).

| What keeps changing | What Kubernetes puts in front | So you never have to |
| --- | --- | --- |
| The container technology (a container is a small box holding an app and all it needs) | Pod (a thin wrapper around a container) | deal with Docker (the best-known container tool) directly |
| A Pod's IP address (its number on the network) | Service (a permanent address for a group of Pods) | update addresses after every restart |
| A node's IP and port (a node is one server; a port is a numbered door on it) | Ingress (rules that route web traffic by domain and path) | show users an ugly address |
| Settings built into an image (the frozen package a container starts from) | ConfigMap and Secret (settings kept outside the image) | rebuild the image for one small change |
| A Pod's short-lived disk | Volume (storage attached to a Pod) | lose data on a restart |
| One single Pod | Deployment or StatefulSet (blueprints that keep copies of a Pod running) | restart things by hand |
| The real storage hardware | PersistentVolumeClaim (a written request for storage) | know where the disk is |
| Many near-identical YAML files (plain text configuration files) | Helm chart (a ready-made package of YAML files) | write the same file twenty times |

The second idea is the loop. You write down what you want, Kubernetes saves it, and it keeps comparing that with what is really running. If there is a gap, it fixes the gap. Chapter 6 shows this loop in detail.

## 1. What Kubernetes is and why it exists

Kubernetes is an open-source (free for anyone to use and change) container orchestration framework (software that runs and manages many containers for you). Google originally developed it.

It manages applications made of hundreds or thousands of containers. They can run on physical machines, virtual machines (computers made of software), cloud environments (computers you rent), or a mix, called hybrid.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Why container orchestration exists<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Read the drawing from left to right. Microservices (one big app split into many small, independent apps) fit perfectly inside containers. So one application became hundreds of containers, and scripts (small home-made programs) could no longer cope.

Container orchestration guarantees three things:

- **High availability.** The app has no downtime (time when nobody can use it), so users can always reach it.
- **Scalability.** The app has high performance: it loads fast and responds quickly.
- **Disaster recovery.** If servers fail or data is lost, the system has a way to restore the latest state.

Think of Kubernetes as a strict restaurant manager. You say, "Five cooks must always be working." If one goes home sick, the manager brings in a replacement before customers notice.

**Architect's note.** The course lists disaster recovery as a promise, and that is true for your running apps. Later it also says that Kubernetes does not manage your data. Both are correct: Kubernetes can bring the apps back, but only your own back-ups can bring the data back.

### Real-world stories

- **Pokémon GO: scalability under shock.** In 2016 the teams planned for a normal level of traffic and a worst case of 5 times that level. Real traffic reached 50 times the plan. The game logic ran on Kubernetes, and engineers prepared more than a thousand extra nodes while players were online. Google called it "swapping out the plane's engine in-flight". ([Google Cloud](https://cloud.google.com/blog/products/containers-kubernetes/bringing-pokemon-go-to-life-on-google-cloud), [ITPro](https://www.itpro.com/cloud/363071/pokemon-gos-google-cloud-was-hit-by-50x-expected-server-traffic))
- **GitHub: when tools stop being enough.** Before Kubernetes, a new service took days, weeks or months to deploy. Afterwards, GitHub deployed the code behind github.com to Kubernetes dozens of times a day. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))
- **adidas: speed as a business result.** Six months after the project began, the whole online shop ran on Kubernetes. Releases went from every 4 to 6 weeks to 3 or 4 times a day. ([CNCF](https://www.cncf.io/case-study/adidas/))

## 2. The core components: one app, one problem at a time

The course takes a simple JavaScript app with a simple database. Each new component fixes one real problem with that setup. Kubernetes has many components, but most of the time you use only a handful.

### Node and Pod: the smallest unit

A node, also called a worker node, is a simple server: a physical or virtual machine. A Pod is the smallest unit in Kubernetes. It is an abstraction (a layer that hides the details) over a container.

Why add this layer? So that you can replace the container technology, and so that you work only with the Kubernetes layer, never directly with Docker.

A Pod usually runs one application container. You can run several, but normally only when one main app needs a helper beside it. This helper is called a sidecar (a small assistant container).

Kubernetes gives you a virtual network (a network made of software) out of the box. Each Pod gets its own internal IP address, and Pods use these to talk to each other. The Pod gets the IP, not the container.

Pods are ephemeral (short-lived; they die easily). A Pod dies if its app crashes or its node runs out of resources. A new Pod takes its place, with a new IP address.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Why Pod IP addresses cannot be trusted<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Service and Ingress: a permanent address

A Service is a static (permanent) IP address attached to a Pod. Its life cycle is separate from the Pod's, so the address stays when the Pod dies.

Your app must be open to browsers, so you create an external Service. Your database must stay closed to the public, so you create an internal Service. You choose the type when you create the Service.

An external Service gives you an address like `http://node-ip:port`. That is fine for a quick test, but not for a real product. A real product needs a secure protocol (safe rules for sending data, such as HTTPS) and a domain name (a website name such as my-app.com), so the request goes first to Ingress, which forwards it to the Service.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The path of a request on one node<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### ConfigMap and Secret: settings outside the image

Your app needs the database address. Normally this sits in a properties file (a plain text settings file) or an environment variable (a named setting given to a program), inside the built image. If the Service name changes, you must rebuild the image, push it to the repository (the online store for images), pull it and restart the Pod. That is a lot of work for one line.

A ConfigMap is external configuration: settings kept outside the image. You connect it to the Pod. Now you change the ConfigMap and you are finished.

A Secret is the same idea for credentials (usernames and passwords), certificates (digital proof of identity) and other private data. It is stored in base64 format (a way of writing data as plain letters and numbers), not plain text. The Pod reads both as environment variables or as a properties file.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> External configuration<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Architect's note.** Base64 is not encryption (scrambling data with a secret key), and anyone can decode it with one command. The Kubernetes documentation says Secrets are [stored unencrypted by default](https://www.kubernetes.io/docs/concepts/security/secrets-good-practices/) until you turn encryption on. Think of a Secret as "kept separately", not "locked".

### Volume: data that survives

If the database Pod restarts, its data is gone. A Volume solves this by attaching physical storage on a hard drive to your Pod. The storage can be local, on the same node, or remote, outside the cluster. Remote means cloud storage or your own on-premise storage (in your own building).

Think of storage as an external hard drive plugged into the cluster. Kubernetes explicitly does not manage data persistence (keeping data safe over time). You must back it up, replicate it (copy it elsewhere) and keep it on proper hardware.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Local and remote storage<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Deployment and StatefulSet: no single point of failure

If your only app Pod dies, users see downtime. So you replicate (copy) everything across multiple servers. Node 2 runs a replica (a clone) of your app, connected to the same Service. A Service is also a load balancer (it shares requests between Pods).

You do not create the second Pod by hand. You define a blueprint for the Pod and say how many replicas you want. That blueprint is a Deployment. A Pod is a layer over containers, and a Deployment is a layer over Pods, so in practice you work with Deployments.

You cannot replicate a database with a Deployment. A database has state (its data), so its clones need a mechanism that decides who reads and who writes. Without it you get data inconsistency (copies that disagree). StatefulSet is the component for this. Use it for MySQL, MongoDB, Elasticsearch (all tools that store data) and any other stateful app (an app that keeps data).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The final setup across two nodes<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

StatefulSets are harder to work with than Deployments. That is why many teams host databases outside the cluster and keep only stateless apps (apps that keep no data of their own) inside it.

**Architect's note.** Three small corrections. The course first says a Service picks the least busy Pod; later it says the Pod is picked at random, and [random is the default](https://kubernetes.io/docs/reference/networking/_print/). It says database clones share one storage; chapter 12 shows that each clone has its own copy. It also says StatefulSet keeps reads and writes in sync; chapter 12 makes clear that the database itself must do that work.

### Real-world stories

- **GitHub: the same bricks, many times over.** One test copy of GitHub, made for one code change, contained 12 ConfigMaps, 17 Deployments, 1 Ingress, 1 Namespace (a private space inside a cluster), 6 Secrets and 23 Services. There is nothing exotic in that list. It is this chapter, repeated. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))
- **Chick-fil-A: a dead node is not an outage.** Every restaurant runs its own small cluster. The team writes that a node failure "does not necessarily represent an outage" (a stop in service), because apps move to the other active nodes automatically. That is the drawing above, in a real kitchen. ([Chick-fil-A](https://medium.com/chick-fil-atech/enterprise-restaurant-compute-f5e2fd63d20f))

## 3. Architecture: workers do the work, masters run the show

A cluster has two types of node. Worker nodes run your apps, and master nodes manage the cluster. The course says "master" and "slave", but Kubernetes now says control plane node and worker node, so use those words at work.

The point of this design is that the cluster is self-managed and self-healing (it watches and repairs itself). You do far less by hand.

### Worker nodes: three processes

Each worker node runs many Pods. Three processes (running programs) must be installed on every worker node to make that possible.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Inside a worker node<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

- **Container runtime.** Every Pod has containers inside, so every node needs software that runs them. The course uses Docker.
- **kubelet.** This Kubernetes process talks to both the runtime and the machine. It takes the configuration, starts the Pod with its container, and gives it CPU (processing power), RAM (working memory) and storage from that node.
- **kube-proxy.** It forwards requests from Services to Pods.

Pods on different nodes talk through Services. A Service catches a request and forwards it to a Pod, and kube-proxy does the forwarding. The course says kube-proxy has intelligent logic: if a my-app Pod calls the database, it picks the database replica on the same node. This avoids network overhead (the extra cost of sending data to another machine).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Same-node forwarding, as the course describes it<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Architect's note.** By default kube-proxy [selects a Pod at random](https://kubernetes.io/docs/reference/networking/_print/). Same-node routing is an option you must turn on. Examples are `internalTrafficPolicy: Local`, which [drops the request if no local Pod exists](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/), or the newer [`trafficDistribution` field](https://www.cloudkeeper.com/insights/blog/kubernetes-135-understanding-prefersamenode-and-prefersamezone-traffic-distribution).

### Master nodes: four processes

How do you talk to the cluster? Who decides where a new Pod runs? Who notices when a Pod dies? How does a new server join? The master nodes handle all of this, and four processes run on every master.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Inside a master node<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

- **API server.** This is the cluster gateway. Every update and every query goes through it. It is also the gatekeeper for authentication (checking who you are), so the cluster has a single entry point. That is good for security. You reach it with a UI (a screen with buttons) such as the Kubernetes dashboard, with `kubectl` (the command line tool), or through the Kubernetes API (a way for programs to send requests). (The captions say "kubelet" at this point, but the tool meant is `kubectl`.)
- **Scheduler.** It checks how much CPU and RAM the new Pod needs, then checks what each worker has free, and picks the best node. It only decides. The kubelet actually starts the Pod.
- **Controller manager.** It detects state changes, such as crashed Pods, and tries to recover the cluster as soon as possible.
- **etcd.** This is a key-value store (a simple table of names and values) that holds the cluster state. Every change is saved here. This is how the scheduler knows the free resources and how the API server answers your questions. Your application data is not stored here.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Two request flows<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Architect's note.** The course tells this as a relay race, because that is easy to follow. Reality is closer to a notice board. The scheduler [watches for new Pods with no assigned node](https://v1-30.docs.kubernetes.io/docs/concepts/overview/components), and the others watch in the same way. Nothing is handed over directly, so if one part restarts, the work simply waits for it.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The real shape: one hub<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### A realistic cluster

Master processes are critical, so a real cluster has several masters. The API server is load balanced, and etcd forms a distributed store (one store spread over several machines) across all masters.

The course gives a very small example: two masters and three workers. Master processes matter more but do less work, so masters need less CPU, RAM and storage. Workers run the real load, so they need more.

As your app grows, you add more servers, and this also answers how a new server joins. Take a bare server (a new, empty machine), install the master processes or the worker processes on it, and add it to the cluster.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A small realistic cluster: 2 masters, 3 workers<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Architect's note.** Use three masters, not two. etcd needs a majority to keep working. The [etcd FAQ](https://etcd.io/docs/v3.5/faq/) shows that 2 members survive no failures, 3 survive one, and 5 survive two. An even number adds no safety.

### Real-world stories

- **OpenAI: the brain gets its own machines.** OpenAI has run single clusters of 7,500 nodes. Its largest clusters use 5 API servers and 5 etcd nodes, on their own dedicated nodes, to spread the load and limit the damage if one goes down. One API server can use up to 70 GB of memory. ([OpenAI](https://openai.com/index/scaling-kubernetes-to-7500-nodes/))
- **Monzo: what etcd really does.** Monzo, a UK bank, explained it to customers after an outage. If etcd goes down, running services keep running, but they cannot be upgraded or scaled (given more or fewer copies). Monzo had grown etcd from 3 to 9 members so it could lose a whole zone (a separate group of data centres) and one more member. ([Monzo](https://community.monzo.com/t/resolved-current-account-payments-may-fail-major-outage-27-10-2017/26296/95))
- **Reddit: one renamed word.** On 14 March 2023, Reddit upgraded a cluster from Kubernetes 1.23 to 1.24. That version removed the old `master` node label (a name tag on a node). A network setting still looked for that label, found no nodes, and routing collapsed. Reddit was down for 314 minutes. Kubernetes has no supported downgrade, so the team had to restore from a back-up. ([Reddit](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/))

## 4. Minikube and kubectl: a cluster on your laptop

A production cluster (the real system that serves customers) has multiple masters and multiple worker nodes, each on its own virtual or physical machine. Building that on a laptop is hard or impossible, because it needs a lot of memory and CPU.

Minikube is an open-source tool for exactly this problem. It is a one-node cluster: the master processes and the worker processes run together on one node. That node has the Docker runtime pre-installed, and it runs inside VirtualBox or another hypervisor (software that runs virtual machines). So Minikube works even if your laptop has no Docker of its own.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Production cluster and Minikube, side by side<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

You still need a way to talk to the cluster. Remember that the API server is the main entry point. You can reach it with a UI, with the Kubernetes API, or with kubectl (the Kubernetes command line tool). kubectl is the most powerful of the three.

Once kubectl submits a command to the API server, the worker processes make it happen. They create and destroy the Pods, create the Services, and so on. kubectl is not only for Minikube: it is the tool for every type of cluster, whether local, cloud or hybrid.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Three clients, one door<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Set-up from the course (Mac)

```bash
brew update
brew install hyperkit        # the hypervisor
brew install minikube        # also installs kubectl as a dependency
minikube start --vm-driver=hyperkit
kubectl get nodes            # one node, with the master role
minikube status              # host and kubelet are running
kubectl version              # shows client and server versions
```

If you see both a client version and a server version, Minikube is correctly installed. From now on, use Minikube only to start and delete the cluster. Use kubectl for everything else.

**What has changed.** The flag is now `--driver`, because [`--vm-driver` is deprecated](https://cncfstack.com/minikube-doc/cmd/minikube-start.html) (marked as old and due for removal). You no longer always need a hypervisor: [`minikube start --driver=docker`](https://minikube.sigs.k8s.io/docs/drivers/docker/) runs the node inside Docker. Kubernetes also [removed dockershim](https://kubernetes.io/blog/2022/02/17/dockershim-faq) (the adapter that let it use Docker directly) in version 1.24. The runtime today is usually containerd or CRI-O.

### Real-world stories

- **Chick-fil-A: small clusters can be real clusters.** Minikube shows that a cluster can be tiny. Chick-fil-A runs one in every restaurant. In 2018 the design was three small networked computers with 8 GB of RAM each. Later it used K3s (a lighter Kubernetes that follows the same specification). ([eWeek](https://eweek.com/?p=8990), [Chick-fil-A](https://medium.com/chick-fil-atech/enterprise-restaurant-compute-f5e2fd63d20f))
- **GitHub: a first cluster in hours.** One reason GitHub chose Kubernetes was the first experience. It let the team deploy a small cluster and an app in the first few hours of their test. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))
- **Zalando: serious software, tested on a laptop.** Zalando's Postgres Operator (a program that runs Postgres databases automatically) now runs hundreds of databases. An early version of its README (the project's welcome file) said the best way to test it was to run it in Minikube. ([README](https://github.com/nboukeffa/postgres-operator))

## 5. kubectl in practice: work at the Deployment level

The command `kubectl get` lists any component: `kubectl get nodes`, `kubectl get pod`, `kubectl get services`. On a new cluster you see one node, no Pods and one default Service.

There is no Pod in the list for `kubectl create`. The Pod is the smallest unit, but in practice you create the layer above it, the Deployment. The name and the image are required, and everything else uses default values. The demo uses nginx (a popular web server).

```bash
kubectl create deployment nginx-depl --image=nginx
kubectl get deployment
kubectl get pod          # ContainerCreating, then Running
kubectl get replicaset
```

Between Deployment and Pod sits one more layer, the ReplicaSet (it keeps the right number of Pod copies running). Kubernetes manages it for you, so you will never create, update or delete one by hand.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The layers of abstraction<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

To change something, edit the Deployment. `kubectl edit deployment nginx-depl` opens an auto-generated configuration file. In the course she fixes the image at version 1.16 and saves. The old Pod terminates and a new one starts. The old ReplicaSet now has no Pods, and a new one exists.

### Debugging commands

| Goal | Command | What you learn |
| --- | --- | --- |
| See what the app printed | `kubectl logs <pod>` | The app's own output. If the app logged nothing, you see nothing. |
| Find why a container is not starting | `kubectl describe pod <pod>` | State changes: image pulled, container created, container started. |
| Get a terminal (a window for typing commands) inside the container | `kubectl exec -it <pod> -- bin/bash` | You are inside as the root user (the all-powerful account), so you can test things. |
| Remove everything | `kubectl delete deployment <name>` | The ReplicaSet and Pods go too. |

All CRUD operations (create, read, update, delete) happen at the Deployment level. Everything below follows automatically.

### From commands to files

A Deployment can have many options, and typing them all on one line is impractical. So in practice you write them in a configuration file and run `kubectl apply -f`.

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:                # the blueprint for the Pods
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.16
        ports:
        - containerPort: 80
```

```bash
kubectl apply -f nginx-deployment.yaml   # "created"
# change replicas to 2 in the file, then run it again
kubectl apply -f nginx-deployment.yaml   # "configured"
```

Kubernetes detects whether the component exists. If it does not, Kubernetes creates it. If it does, Kubernetes updates it. So `apply` does both jobs, for any component.

**Architect's note.** This is the most important habit in the course. `create` says "do this", while `apply` says "I want this". A change made with `kubectl edit` works, but no file remembers it. Reddit's story in the next chapter shows why that matters.

### Real-world stories

- **Reddit: the same word you just saw.** During its 2023 outage, engineers found a Pod stuck in `ContainerCreating`, the same status you see in this demo. They deleted Pods, restarted components and read logs. The cause was found much later, in a search through 3.9 billion log lines. ([Reddit](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/))
- **Monzo: the logs held the answer.** In the 2017 outage, engineers noticed a `NullPointerException` (a common program crash error) in the logs of linkerd, the tool that routes calls between services. It led them to a Service with no running Pods behind it. Deleting that Service ended the outage. ([Monzo](https://community.monzo.com/t/resolved-current-account-payments-may-fail-major-outage-27-10-2017/26296/95))
- **GitHub: kubectl through chat.** GitHub built a chat service called `kube-me`. It offers a limited set of kubectl commands, so engineers can help themselves with less risk. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))

## 6. YAML configuration files: you write the wish, Kubernetes keeps it true

Large configuration files can look frightening, but they are simple and logical. Every file starts with two lines that declare what you are creating, then it has three parts. Each component has its own API version, so you look that up.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A Deployment file and a Service file, side by side<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Metadata holds the name and labels. The specification holds every setting you want for that component, so its attributes depend on the kind. The status is not written by you. Kubernetes generates it and adds it.

### The self-healing loop

Kubernetes always compares the desired state with the actual status. If they do not match, it knows there is something to fix. This is the basis of self-healing.

The status data comes from etcd, the cluster brain, which holds the current state of every component.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The self-healing loop<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

This is the loop that you should remember from the whole course. Everything else is a detail of it.

### Format, and where to keep the files

YAML is simple but very strict about indentation (the spaces at the start of a line). One wrong space makes the file invalid. For long files, use an online YAML validator (a website that finds mistakes in the file).

The usual practice is to store these files with your application code, as part of infrastructure as code (managing systems through files instead of by hand). You can also give them their own Git repository (Git is a tool that records every change to files).

### Template: a configuration inside a configuration

A Deployment manages Pods, so its specification contains a `template`. The template has its own metadata and specification, because it is the blueprint for the Pods. It holds the image, the container name and the port. This is why a change to a Deployment cascades down (flows automatically) to its Pods.

### Labels and selectors: how components find each other

A label is a key-value pair that you attach to a component, such as `app: nginx`. You can choose any pair you like. Pods created from the blueprint get this label.

A selector says which labels to match. The Deployment's selector tells it which Pods belong to it. The Service's selector tells it which Pods to send requests to.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> How components find each other<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Ports

The Service has its own port, where other components reach it. It must also know which port on the Pod to forward to. That is the target port, and it must match the container port.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Where each port number belongs (example numbers)<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Check the result yourself

```bash
kubectl apply -f nginx-deployment.yaml
kubectl apply -f nginx-service.yaml
kubectl describe service nginx-service   # Endpoints: the Pod IPs and ports
kubectl get pod -o wide                  # compare with the real Pod IPs
kubectl get deployment nginx-deployment -o yaml > nginx-deployment-result.yaml
kubectl delete -f nginx-deployment.yaml
kubectl delete -f nginx-service.yaml
```

The saved result shows the status part, which helps with debugging. It also shows data that Kubernetes added, such as a creation timestamp, a unique ID and default values. If you want to copy a Deployment from this output, remove all that generated data first.

### Real-world stories

- **Chick-fil-A: Git tells every kitchen what to run.** Each restaurant has its own Git repository. A small agent called Vessel polls (keeps checking) it and applies any change to the local cluster. More than 2,500 clusters follow their files this way, mostly untouched by hand. ([Chick-fil-A](https://medium.com/chick-fil-atech/enterprise-restaurant-compute-f5e2fd63d20f), [eWeek](https://eweek.com/?p=8990))
- **Reddit: the file that never existed.** Reddit's outage came from a setting that was, in its own words, "committed nowhere" (saved in no Git repository). The people who knew about it had moved on. Nobody could search for the old label, because there was no file to search. ([Reddit](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/))
- **Zalando: one short file, one whole database cluster.** Engineers submit a single YAML file that describes the Postgres cluster they want. An operator (a program that does an expert's job automatically) takes care of the rest. It is the same loop, applied to databases. ([Zalando](https://engineering.zalando.com/posts/2018/11/postgres-operator.html))

## 7. Worked demo: MongoDB and Mongo Express

This demo deploys MongoDB (a database) and Mongo Express (a web page for managing it). It is a typical web app with a database, so you can reuse the pattern for any similar pair.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The MongoDB and Mongo Express setup<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

The order of creation matters. If a Deployment references a Secret or ConfigMap that does not exist yet, you get an error and the Pod does not start.

1. Create the Secret with the root username and password.
2. Create the MongoDB Deployment, which reads those values from the Secret.
3. Create the internal Service for MongoDB, so that only components inside the cluster can reach it.
4. Create the ConfigMap with the database address.
5. Create the Mongo Express Deployment, which reads both the Secret and the ConfigMap.
6. Create the external Service for Mongo Express, so that a browser can reach it.

### Step 1: the Secret

This file only prepares the data. Nothing exists in the cluster until you apply it. The values must be base64 encoded, so you encode them first.

```bash
echo -n 'username' | base64    # dXNlcm5hbWU=
echo -n 'password' | base64    # cGFzc3dvcmQ=
```

Do not forget the `-n` option. Without it, a hidden new-line character becomes part of your value, and the login fails.

```yaml
# mongo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-secret
type: Opaque                 # the default type: simple key-value pairs
data:
  mongo-root-username: dXNlcm5hbWU=
  mongo-root-password: cGFzc3dvcmQ=
```

### Steps 2 and 3: MongoDB and its internal Service

The image page on Docker Hub (the public store for images) tells you what you need: the port and the environment variables. The Deployment file goes into a Git repository, so it must not contain the password. It only points to the Secret.

Three dashes (`---`) start a new document inside one YAML file. A Deployment and its Service belong together, so keep them in one file.

```yaml
# mongo.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb-deployment
  labels:
    app: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongo-root-username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongo-root-password
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
spec:
  selector:
    app: mongodb
  ports:
  - protocol: TCP
    port: 27017
    targetPort: 27017
```

```bash
kubectl apply -f mongo-secret.yaml
kubectl apply -f mongo.yaml
kubectl get all | grep mongodb            # everything for this app
kubectl describe service mongodb-service  # the endpoint is the Pod IP
kubectl get pod -o wide                   # confirm that it is the right Pod
```

Apply the same file again after an edit, and Kubernetes changes only what is different.

### Steps 4 to 6: Mongo Express

The database address could be written directly in the Deployment. A ConfigMap is better, because it is centralised. If two apps use this database, you change the address in one place. The value is simply the Service name.

```yaml
# mongo-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-configmap
data:
  database_url: mongodb-service
```

```yaml
# mongo-express.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo-express
  labels:
    app: mongo-express
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo-express
  template:
    metadata:
      labels:
        app: mongo-express
    spec:
      containers:
      - name: mongo-express
        image: mongo-express
        ports:
        - containerPort: 8081
        env:
        - name: ME_CONFIG_MONGODB_ADMINUSERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongo-root-username
        - name: ME_CONFIG_MONGODB_ADMINPASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: mongo-root-password
        - name: ME_CONFIG_MONGODB_SERVER
          valueFrom:
            configMapKeyRef:
              name: mongodb-configmap
              key: database_url
---
apiVersion: v1
kind: Service
metadata:
  name: mongo-express-service
spec:
  selector:
    app: mongo-express
  type: LoadBalancer         # this makes it external
  ports:
  - protocol: TCP
    port: 8081
    targetPort: 8081
    nodePort: 30000          # must be between 30000 and 32767
```

```bash
kubectl apply -f mongo-configmap.yaml
kubectl apply -f mongo-express.yaml
kubectl logs <mongo-express-pod>          # "database connected"
```

### What makes a Service external

Two things: `type: LoadBalancer` and a third port, `nodePort`, which is the port you type in the browser. An internal Service needs neither, because ClusterIP is the default type.

```text
NAME                    TYPE           EXTERNAL-IP   PORT(S)
mongodb-service         ClusterIP      <none>        27017/TCP
mongo-express-service   LoadBalancer   <pending>     8081:30000/TCP
```

ClusterIP gives the Service an internal IP address. LoadBalancer gives it an internal one and an external one. In a normal cluster you would see a public IP here. In Minikube it stays `<pending>`, so you run one more command:

```bash
minikube service mongo-express-service
```

The browser opens the Mongo Express page. When you create a new database there, the request travels exactly as the drawing shows, and the answer comes all the way back.

She also makes a fair complaint: LoadBalancer is a confusing name, because an internal Service balances load too.

**Architect's notes.** Newer Mongo Express images use one [connection string, `ME_CONFIG_MONGODB_URL`](https://github.com/mongo-express/mongo-express-docker), so check the image page if the old variables fail. The demo pulls the latest image, but production files should fix a version. Also, this setup is for your laptop only. Never open a database admin page to the internet.

### Real-world stories

- **The 2017 MongoDB ransom wave: why the database stays internal.** Attackers looked for MongoDB servers open to the internet without proper protection. They wiped the data and left a ransom note. By 11 January, a tracker had counted 32,820 victims. An internal Service stops this type of attack at the door, because no outside request can reach the Pod. ([CSO Online](https://www.csoonline.com/article/559459/exposed-mongodb-installs-being-erased-held-for-ransom.html))
- **Tesla, 2018: why credentials deserve care.** Attackers found a Kubernetes console with no password. Inside a Pod they found access credentials for Tesla's AWS (Amazon's cloud) account, and they used its computers to mine cryptocurrency. Tesla said that only internal test-car data was involved. A Secret helps only if the doors around it are locked too. ([Trend Micro](https://www.trendmicro.com/vinfo/fr/security/news/cybercrime-and-digital-threats/tesla-and-jenkins-servers-fall-victim-to-cryptominers))

## 8. Namespaces: virtual clusters inside one cluster

A namespace organises resources inside a cluster. Think of it as a virtual cluster inside the real one, like separate floors in a single office building.

A new cluster comes with these namespaces out of the box:

| Namespace | What it is for |
| --- | --- |
| `kube-system` | System processes and master processes. Do not create or change anything here. |
| `kube-public` | Publicly accessible data, including a ConfigMap with cluster information that needs no authentication. `kubectl cluster-info` shows it. |
| `kube-node-lease` | Heartbeats of nodes (regular "I am alive" signals). Each node has its own object here. |
| `default` | Where your resources go until you create your own namespace. |
| `kubernetes-dashboard` | Only in Minikube. A standard cluster does not have it. |

Create a new one with `kubectl create namespace my-namespace`, or with a namespace configuration file. The file is better, because your repository then keeps a history of what you created.

### Why use namespaces

**1. To group resources.** A complex app quickly fills the default namespace, and it becomes hard to see what is there. So you group by purpose, such as a monitoring namespace for Prometheus (a monitoring tool) or one for Elasticsearch and Kibana (tools to store and view logs).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Group resources by what they do<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

The official documentation says small projects with a few to tens of users [may not need namespaces](https://www.kubernetes.io/docs/concepts/overview/working-with-objects/namespaces). She disagrees: even small projects soon add logging and monitoring, so grouping is always a good idea.

**2. To avoid conflicts between teams.** Two teams share a cluster. Both deploy something called `my-app-deployment`, with different configurations. The second one overwrites the first, and an automated tool like Jenkins (software that deploys code for you) may not even show it. With a namespace each, the same name causes no conflict.

**3. To limit access and resources.** You can give each team access to its own namespace only. You can also set a resource quota (a limit) on the CPU, RAM and storage that one namespace may use. Then one team cannot starve the others.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Conflict, access and quotas<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**4. To share common resources between environments.** You can host staging (the final test copy) and development (where new work is built) in one cluster. Tools such as the Nginx Ingress Controller or the Elastic Stack (tools for logs) are deployed once and used by both.

**5. To run blue/green deployment.** This means running two production versions in the same cluster: the active one (blue) and the next one (green). Again, both can use the same shared tools.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Shared resources for staging, development and blue/green<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### The rules at the border

You cannot use most resources from another namespace. A ConfigMap in Project A cannot be used in Project B. Each namespace must define its own, even if the content is the same. The same is true for Secrets.

A Service is the exception. You add the namespace to the end of its name, as in `mysql-service.database`. That is how shared tools like Elasticsearch or Nginx are reached from other namespaces.

Some components are not namespaced at all. They live globally in the cluster, such as Nodes and PersistentVolumes.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The rules at the border<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

```bash
kubectl api-resources --namespaced=false   # components with no namespace
kubectl api-resources --namespaced=true    # components inside a namespace
```

### Creating components in a namespace

If you give no namespace, Kubernetes uses `default`. You have two options:

```bash
# Option 1: a flag on the command
kubectl apply -f mysql-configmap.yaml --namespace=my-namespace
```

```yaml
# Option 2: an attribute in the file (recommended)
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-configmap
  namespace: my-namespace
```

She recommends the file. It documents where the component lives, and it suits automated deployments. To see the result, add the flag: `kubectl get configmap -n my-namespace`.

Typing `-n` all day is annoying, so she installs `kubens` (it comes with `kubectx`) to change the active namespace.

**Architect's note.** The course says kubectl has no built-in way to do this, but it [does](https://v1-34.docs.kubernetes.io/docs/concepts/overview/working-with-objects/namespaces): `kubectl config set-context --current --namespace=my-namespace`.

### Real-world stories

- **GitHub: a throwaway namespace for each test.** Every review lab, a full test copy of GitHub, gets its own namespace. Labs are cleaned up one day after their last deploy. Cleaning up is as simple as deleting the namespace. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))
- **Zalando: experiments that vanish cleanly.** Zalando's teams run experiments in a dedicated namespace. When the results are no longer needed, they simply drop the namespace. ([Zalando](https://engineering.zalando.com/posts/2018/11/postgres-operator.html))
- **GitHub: new and old side by side.** To test Kubernetes safely, GitHub deployed its new resources to a `github-production` namespace, in parallel with the existing servers. Staff could opt in first, and real traffic followed slowly. This is the thinking behind blue/green. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))

## 9. Ingress: a real address for real users

An external Service lets users reach your app with the node's IP and a port. That is good for testing, but a final product needs a domain name and a secure HTTPS connection (the padlock in the browser). So you replace the external Service with an internal Service, and put Ingress in front of it.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> External Service compared with Ingress<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### External Service and Ingress compared

```yaml
# Before: an external Service
apiVersion: v1
kind: Service
metadata:
  name: myapp-external-service
spec:
  selector:
    app: myapp
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
    nodePort: 30000
```

```yaml
# After: an Ingress, in today's syntax
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
spec:
  rules:
  - host: myapp.com          # what the user types in the browser
    http:                    # step 2: Ingress to Service, not browser to Ingress
      paths:
      - path: /              # the part of the URL after the domain
        pathType: Prefix
        backend:
          service:
            name: myapp-internal-service
            port:
              number: 8080
```

- The `http` line does not describe the browser's request. It is the protocol for the second step, from Ingress to the internal Service.
- The backend `name` and `port` must match the internal Service.
- The internal Service has no `nodePort`, and its type is the default, ClusterIP.
- The `host` must be a valid domain. You map it to the IP address of your entry point, which is a node or a separate server.

The course shows an older Ingress format. The file above uses the [current format](https://kubernetes.io/docs/concepts/services-networking/ingress/), where `pathType` is required.

### Ingress Controller: the part that does the work

The Ingress file alone does nothing. You also need an implementation, called an Ingress Controller. This is a Pod, or a set of Pods, that runs in your cluster. It is the entry point for all requests to your domains. You may have 50 rules, so it evaluates them all and decides which one applies.

You choose from many third-party implementations (versions made by other groups). The course uses the Nginx Ingress Controller from Kubernetes.

The cluster also needs something in front of the controller, and that depends on where it runs. Cloud providers give you a load balancer with little effort. On bare metal (your own physical servers) you must set up the entry point yourself.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The entry point depends on where the cluster runs<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Demo in Minikube

She makes the Kubernetes dashboard reachable at `dashboard.com`. The internal Service and Pod already exist, so she only adds the controller and a rule.

```bash
minikube addons enable ingress            # starts the Nginx controller
kubectl get pod -n kube-system            # find the controller Pod
kubectl get all -n kubernetes-dashboard   # the Service and Pod already exist
```

Newer Minikube versions may run the controller in its own namespace. If you do not see it, use `kubectl get pods --all-namespaces`.

```yaml
# dashboard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: kubernetes-dashboard   # same namespace as the Service
spec:
  rules:
  - host: dashboard.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 80
```

```bash
kubectl apply -f dashboard-ingress.yaml
kubectl get ingress -n kubernetes-dashboard --watch   # wait for an ADDRESS
sudo vim /etc/hosts                                   # add: <ADDRESS> dashboard.com
```

The name `dashboard.com` is made up, so the hosts file (a small name-and-address list) maps it to the IP address, on your laptop only. The request then enters Minikube, reaches the controller, matches the rule and goes to the Service.

### Default backend

`kubectl describe ingress dashboard-ingress -n kubernetes-dashboard` shows a default backend, `default-http-backend:80`. It handles any request that matches no rule. A good use is a custom error page: create an internal Service with that name and port, plus a Pod that sends your message.

### Finer routing

Google has one domain with many separate apps, such as Gmail and Calendar. You can do the same.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Two ways to route to several apps<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

```yaml
# One host, many paths
rules:
- host: myapp.com
  http:
    paths:
    - path: /analytics
      pathType: Prefix
      backend:
        service:
          name: analytics-service
          port:
            number: 3000
    - path: /shopping
      pathType: Prefix
      backend:
        service:
          name: shopping-service
          port:
            number: 8080
```

For subdomains, write one `host` entry for each, such as `analytics.myapp.com`, with one path inside.

### TLS: turning on HTTPS

TLS (Transport Layer Security) is what puts the S in HTTPS. Add a `tls` block above the rules, and create a Secret that holds the certificate.

```yaml
spec:
  tls:
  - hosts:
    - myapp.com
    secretName: myapp-secret-tls
  rules:
  # ...the same rules as before
---
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret-tls
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded certificate contents>
  tls.key: <base64-encoded key contents>
```

Three small rules. The keys must be named exactly `tls.crt` and `tls.key`. The values are the real file contents, not a file path. The Secret must be in the same namespace as the Ingress.

**What has changed.** The Ingress API is now [frozen](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/), and Kubernetes recommends the newer Gateway API (a fuller set of routing rules) instead. Ingress itself is not being removed. However, the Ingress NGINX controller from this course was [retired in March 2026](https://opensource.googleblog.com/2026/02/the-end-of-an-era-transitioning-away-from-ingress-nginx.html), so it gets no more fixes. The idea you learnt stays the same: rules, a controller, and an entry point.

### Real-world stories

- **Ingress NGINX: when the front door is the risk.** In March 2025, Wiz researchers disclosed a set of flaws called IngressNightmare. Wiz said 41% of internet-facing clusters ran this controller. The critical flaw scored 9.8 out of 10. A component that receives all your traffic deserves the most careful patching (applying security fixes). ([SecurityWeek](https://www.securityweek.com/ingressnightmare-flaws-expose-many-kubernetes-clusters-to-remote-hacking/amp/), [SUSE](https://www.suse.com/c/rancher_blog/ending-the-ingressnightmare-how-suse-secures-your-kubernetes-clusters-from-external-and-internal-threats))
- **Pokémon GO: the cloud lane.** While traffic was surging, the team replaced its load balancer with Google's HTTP/S Load Balancer, which gave more control and faster connections. That is the first box in the cloud lane. ([ITPro](https://www.itpro.com/cloud/363071/pokemon-gos-google-cloud-was-hit-by-50x-expected-server-traffic))
- **GitHub: the bare metal lane.** GitHub runs in its own data centres, so no cloud provider gives it a load balancer. It extended its own load balancer, GLB, to send traffic to Kubernetes. That is the proxy server box. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))

## 10. Helm: a package manager for Kubernetes

Helm changes a lot from version to version, so the course focuses on principles and use cases. Helm has three main features.

### Feature 1: package manager

Think of apt, yum or Homebrew (tools that install software for you), but for Kubernetes. Say your app needs Elastic Stack for its logs. You would need a StatefulSet, a ConfigMap, a Secret, a user with permissions, and some Services.

Finding, testing and fixing all those files is tedious, and everyone needs nearly the same set. So someone writes them once and shares them. That bundle of YAML files is a Helm chart.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Helm as a package manager<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

You look for a chart with `helm search <keyword>` or on a public website, and you install it with `helm install <chartname>`. Often the chart comes from the company that made the application. Companies also keep private registries (private chart stores) to share their own charts internally.

### Feature 2: templating engine

A microservice app often has many Deployment and Service files that differ in only a few lines, such as the name and version. With Helm you write one common blueprint and put placeholders where values change.

```yaml
# A template file
apiVersion: v1
kind: Pod
metadata:
  name: {{ .Values.name }}
spec:
  containers:
  - name: {{ .Values.container.name }}
    image: {{ .Values.container.image }}
    ports:
    - containerPort: {{ .Values.container.port }}
```

```yaml
# values.yaml
name: my-app
container:
  name: my-app-container
  image: my-app-image
  port: 9001
```

`.Values` is an object built from `values.yaml` and from the `--set` command line flag. This is very useful with CI/CD (automated build and delivery): your pipeline replaces the values just before it deploys.

It also helps when you deploy the same app to development, staging and production clusters. You package everything into one chart and use one command.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Helm as a templating engine<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Chart structure and overriding values

When you run `helm install`, Helm fills the template files with the values and produces valid Kubernetes manifests (the final YAML files). The values in `values.yaml` are only defaults, and you can override them.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Chart structure and value overrides (example values)<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

```bash
helm install --values=my-values.yaml <chartname>   # override with a file
helm install --set version=2.0.0 <chartname>       # override on the command line
```

Files are better than long commands, because they are organised and easier to manage.

### Feature 3: release management

A release is one installed copy of a chart. In Helm 2 there are two parts: the Helm client (the tool on your laptop) and a server called Tiller, which runs inside the cluster. Tiller keeps a copy of each configuration, and so builds a history. That gives you two useful commands:

```bash
helm upgrade <chartname>    # changes the existing deployment; does not recreate it
helm rollback <chartname>   # goes back if the upgrade went wrong
```

But Tiller had too much power inside the cluster, which made it a big security issue. So Helm 3 removed it, and Helm is now a simple binary (a single program file).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Release management in Helm 2 and Helm 3<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**What has changed.**

- The course can sound as if rollback depended on Tiller. It does not. Helm 3 [stores release information in Secrets, in the same namespace as the release](https://v3.helm.sh/docs/faq/changes_since_helm2).
- `helm install` now [needs a release name](https://blog.helm.sh/docs/faq/changes_since_helm2), as in `helm install my-release <chart>`.
- Helm Hub is gone. [Artifact Hub](https://blog.helm.sh/community/stable-repo-charts-new-locations) is now the place to find charts.
- Helm 4 arrived in November 2025. Helm 3 gets [security fixes until 10 February 2027](https://helm.sh/blog/helm-v3-end-of-life), and Helm 4 can manage existing Helm 3 releases.

### Real-world stories

- **Bitnami: a chart is only as reliable as its supplier.** Bitnami charts were a very popular source. In August 2025 Bitnami moved its existing free images to a legacy repository with no further updates. Deployed charts could fail to pull images, so teams had to change their values or pay for a subscription. ([Bitnami](https://github.com/bitnami/charts/issues/35164))
- **Helm's stable repository: too big for one team.** The central chart repository grew from about 100 to over 300 charts, and the maintainers could not keep up. In November 2020 it closed, and charts moved to their own owners' repositories. ([Helm](https://helm.sh/blog/charts-repo-deprecation))
- **Kubernetes Dashboard: Helm as the normal way in.** Before it was archived, the dashboard you met in this course [supported only Helm-based installation](https://github.com/kubernetes-retired/dashboard). One command installed the whole app with all its parts.

## 11. Volumes: data that outlives the Pod

By default, when a Pod restarts, all its changes are gone. Kubernetes gives you no data persistence out of the box, so you must configure it for each app that needs it.

Reliable storage for a database must meet three requirements:

1. It must not depend on the Pod life cycle, so the new Pod can pick up where the old one stopped.
2. It must be available on all nodes, because you do not know where the new Pod will start.
3. It must survive even if the whole cluster crashes.

This is not only for databases. An app may also read and write files in a directory, such as session files or configuration files.

### PersistentVolume: the interface

A PersistentVolume, or PV, is a cluster resource that stores data, just like RAM or CPU are resources. You create it with a YAML file. But it is only an abstract component, so its space must come from real physical storage.

That is the tricky part. Kubernetes does not care about your actual storage. It only gives you the PV as an interface. You must decide what storage you need, then create and manage it, including back-ups. The course counts more than 25 storage backends in the official documentation.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> PersistentVolume and its storage backends<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-name
spec:
  capacity:
    storage: 5Gi          # how much storage
  accessModes:
  - ReadWriteOnce         # should it be read-write or read-only, and so on
  nfs:                    # the storage backend and its settings
    path: /dir/path/on/nfs/server
    server: nfs-server-ip-address
```

NFS (Network File System) is a way to share a disk over a network. The attributes change with the backend. A local volume, for example, also needs a `nodeAffinity` attribute (a rule that ties it to a certain node).

Local volumes break requirements 2 and 3, because they are tied to one node and do not survive a cluster crash. So for databases you should almost always use remote storage.

### Two roles, and the claim

PersistentVolumes are like CPU or RAM: they must already exist when the Pod that needs them is created. So there are two roles. The administrator sets up the cluster and its storage. The user, a developer or DevOps team, deploys the apps.

The app must ask for storage explicitly. It does this with a PersistentVolumeClaim, or PVC. A claim states the size and the access type it needs. Any PV that satisfies the claim will be used.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-name
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi     # more than the 5Gi PV above, so that PV would not match
```

You then use the claim in the Pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  containers:
  - name: myfrontend
    image: nginx
    volumeMounts:             # container level: where it appears
    - mountPath: /var/www/html
      name: mypd
  volumes:                    # Pod level: which storage
  - name: mypd
    persistentVolumeClaim:
      claimName: pvc-name
```

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Levels of abstraction, and who does what<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

The claim must be in the same namespace as the Pod, but PVs are not namespaced. The volume is mounted (attached so that it appears as a folder) into the Pod, then into the containers you choose. When the Pod dies, the new Pod sees the same storage and all the earlier changes.

Why so many layers? Because a developer just wants 50 GB for Elasticsearch or 10 GB for an app. Whether it lives on GlusterFS, AWS EBS (both storage systems) or a local disk is not their concern. They make a claim and assume the storage is there.

### ConfigMap and Secret as volumes

These two are local volumes, but they are not created through a PV and PVC. They are their own components, managed by Kubernetes. Use them when a Pod needs a file, such as a configuration file for Prometheus or Mosquitto (a tool that passes messages between apps), or a certificate. You mount them in the same way.

At its core, a volume is just a directory, possibly with data in it, that containers in a Pod can access. The volume type decides what stands behind that directory. One Pod can use several types at the same time.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> volumes at Pod level, volumeMounts at container level (example names)<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### StorageClass: storage on demand

Imagine hundreds of apps with new deployments every day. Developers ask admins, and admins create hundreds of PVs by hand. That is tedious, slow and messy.

A StorageClass creates, or provisions, PVs dynamically whenever a PVC claims them. It is another layer of abstraction over the storage provider and its settings, such as the disk type.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Static and dynamic provisioning<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: storage-class-name
provisioner: ebs.csi.aws.com     # which provisioner to use
parameters:
  type: gp3                      # the kind of disk
```

```yaml
# Added to the PVC
spec:
  storageClassName: storage-class-name
```

**What has changed.** The course shows internal provisioners with names starting with `kubernetes.io`, such as the AWS one. That AWS driver was [deprecated in 1.19 and removed in 1.27](https://kubernetes.io/docs/concepts/storage/storage-classes). Today you install an external CSI driver (Container Storage Interface, a standard plug for storage), as in the file above.

### Real-world stories

- **The 2017 MongoDB victims: back-ups are your job.** Of 119 victims who got help, 85 had lost production data and only 13 had recent back-ups. Kubernetes would not have saved them either, because it does not back up your data. ([CSO Online](https://www.csoonline.com/article/559459/exposed-mongodb-installs-being-erased-held-for-ransom.html))
- **OpenAI: do not use a PV out of habit.** OpenAI keeps only a few PersistentVolumes. Most jobs use blob storage (a huge online store for files), because it scales further and avoids slow attach and detach steps. ([OpenAI](https://openai.com/index/scaling-kubernetes-to-7500-nodes/))
- **adidas: storage is a resource too.** In November 2017 adidas filled its Prometheus database and could not reduce the retention period (how long data is kept) enough. Disk space needs watching, just like CPU and RAM. ([Kubernetes case study](https://kubernetes.io/vi/case-studies/adidas/))

## 12. StatefulSet: when Pods are not interchangeable

A stateful application stores data to keep track of its state. All databases are stateful, such as MySQL, Elasticsearch and MongoDB. A stateless application keeps no record of earlier requests, so it treats each request as completely new.

They often work together. A Node.js app (a server app written in JavaScript) can handle a request using only the payload (the data inside the request), so it is just a pass-through. MongoDB must update or query data based on the latest state, so it depends on what came before.

Stateless apps use a Deployment, and stateful apps use a StatefulSet. Both create Pods from an identical container specification, and both can replicate them and configure storage in the same way. So why are there two components?

### Identity is the difference

Scaling a Java app is easy. Its Pods are identical and interchangeable. They start in any order, get random hashes (short random strings) in their names, and one Service sends requests to any of them.

MySQL Pods cannot be created or deleted in any order, and they cannot be addressed at random. So a StatefulSet gives each Pod a sticky identity: a persistent identifier that it keeps across any rescheduling.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Deployment and StatefulSet compared (example Pod names)<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Why a database Pod needs an identity

One MySQL Pod can both read and write. But if two independent instances change the same data, you get data inconsistency. So only one Pod may write. It is called the master, and the others are called slaves. Many Pods may read at the same time.

These Pods do not share one physical storage. Each has its own replica of the data, and they must synchronise continuously. When the master changes data, every slave updates its own copy.

A new replica first clones the data from the previous Pod, never from a random one. Once it has the latest data, it starts continuous synchronisation too.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Replicating a MySQL database<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

This leads to an interesting point. You could use temporary storage, because the data is replicated between Pods. But if all Pods die at once, the data is gone. So if losing data is unacceptable, use persistent storage. A PV's life cycle is not tied to the StatefulSet, so the data survives even if you delete the whole StatefulSet.

### State lives in the storage

Each Pod's own storage holds the replicated data and the Pod's state, such as whether it is a master or a slave. When a Pod dies, its persistent identifier makes sure the same storage is reattached to the replacement.

For this to work, you need remote storage. The new Pod may start on another node, and local storage is usually tied to one node.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Why stateful Pods need remote storage<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Names, order and addresses

A Deployment's Pods get random hashes. StatefulSet Pods get fixed, ordered names: the StatefulSet name plus an ordinal (a position number) starting from 0. So a StatefulSet called `mysql` with three replicas gives you `mysql-0`, `mysql-1` and `mysql-2`. The first is the master, and the slaves follow in startup order.

The next Pod is not created until the previous one is up and running. If creation fails or stays pending, the next one simply waits. Deletion runs in reverse: `mysql-2` first, then a wait, then `mysql-1`. These rules protect the data.

Each Pod also gets its own DNS endpoint (DNS is the internet's phone book, turning names into IP addresses). This is the Pod name plus the governing Service name. Deployment Pods do not have this.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Pod names, order and DNS endpoints<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### What you must still do yourself

Kubernetes helps, but it does not give you a ready solution. You must configure the cloning and data synchronisation, make remote storage available, and manage and back it up. The reason is simple: containers fit stateless apps perfectly, and stateful apps are not a perfect candidate.

**Architect's notes.**

- A StatefulSet knows nothing about masters and slaves. It only gives identity and order. The database setup decides the roles, and that is why teams often use an operator.
- Ordered deletion is guaranteed for scaling down. If you delete a whole StatefulSet, [there is no ordering guarantee](https://v1-31.docs.kubernetes.io/docs/concepts/abstractions/controllers/statefulsets), so scale it to 0 first.
- The real DNS name is longer, such as [`web-0.nginx.default.svc.cluster.local`](https://v1-33.docs.kubernetes.io/docs/concepts/workloads/controllers/statefulset/). It needs a headless Service, explained in the next chapter.
- The field `volumeClaimTemplates` is how [each Pod gets its own claim](https://v1-34.docs.kubernetes.io/docs/concepts/workloads/controllers/statefulset/).
- Many databases now say primary and replica, instead of master and slave.

### Real-world stories

- **Zalando: automation is the only way to scale this.** Zalando runs more than 450 Postgres clusters on Kubernetes. With tens of teams and hundreds of databases, it says that "any kind of manual operations was out of the question". So it built an operator that creates StatefulSets and handles the expert work. ([Zalando](https://engineering.zalando.com/posts/2018/11/postgres-operator.html), [README](https://github.com/theRealWardo/postgres-operator))
- **OpenAI: members that must arrive together.** OpenAI's experiments often use StatefulSets, and all members must be scheduled before training can start. By default, Kubernetes might place half of two experiments and deadlock both (each waits for the other, for ever), so OpenAI added a scheduling plugin (an add-on that places a whole group together). When Pods are not interchangeable, even their start needs care. ([OpenAI](https://openai.com/index/scaling-kubernetes-to-7500-nodes/))
- **GitHub: stateless first.** When GitHub moved its main application, the first migration was "intentionally limited to stateless workloads". That matches this chapter's advice: containers fit stateless apps first. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))

## 13. Services in depth: four types for four jobs

Pods come and go, and each new Pod gets a new IP address. A Service gives you a stable IP address in front of them, and it balances load across the replicas. It is an abstraction for loose coupling (parts that connect without depending on each other's details), inside the cluster and from outside.

### ClusterIP: the default

If you do not specify a type, you get ClusterIP, the most common type. Imagine a Pod with a microservice on port 3000 and a sidecar that collects logs on port 9000. Both ports are open inside the Pod.

Each worker node gets its own range of internal IP addresses, and a Pod takes its IP from the range of its node. `kubectl get pod -o wide` shows you these IPs.

A Service is not a process. It is an abstraction layer that represents an IP address. Ingress rules name the Service, and DNS maps that name to the Service's IP address.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A ClusterIP Service in front of two Pod replicas (example IP ranges)<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

The Service must answer two questions.

**Which Pods?** The selector decides. A Pod must match all the labels in the selector, not just one. Matching Pods become the Service's endpoints.

**Which port on the Pod?** The `targetPort` decides. It is needed because a Pod can have several ports open.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: microservice-one-service
spec:
  selector:
    app: my-app
    type: microservice
  ports:
  - protocol: TCP
    port: 3200         # your choice: where the Service listens
    targetPort: 3000   # not your choice: must match the container port
```

Kubernetes also creates an Endpoints object with the same name as the Service. It tracks which Pods are members, and it updates when Pods appear or die.

### Multi-port Services

Suppose the MongoDB Pod also runs `mongodb-exporter`, a helper that gives metrics (measurements) to Prometheus on port 9216. Now one Service must handle two kinds of request, so it opens two ports. With several ports, each one must have a name. With a single port, the name is optional.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A multi-port Service<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

```yaml
ports:
- name: mongodb
  protocol: TCP
  port: 27017
  targetPort: 27017
- name: mongodb-exporter
  protocol: TCP
  port: 9216
  targetPort: 9216
```

### Headless Service: talk to one exact Pod

Sometimes a client must reach one specific Pod, or Pods must talk to each other directly. Stateful apps are the common case. A MySQL worker must connect to the master to sync, and a new worker must clone from the most recent one.

The client could ask the API server for all Pod IPs. But that ties your app to the Kubernetes API, and it is inefficient. So Kubernetes uses DNS. Normally a DNS lookup returns the Service's one IP address. If you set `clusterIP: None`, DNS returns the Pod IP addresses instead.

```yaml
spec:
  clusterIP: None      # this makes it headless
  selector:
    app: mongodb
  ports:
  - protocol: TCP
    port: 27017
    targetPort: 27017
```

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> ClusterIP compared with headless<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

For stateful apps you run both Services side by side. The ClusterIP Service handles normal load-balanced traffic. The headless Service handles direct traffic, such as writing to the master or Pods syncing with each other.

### NodePort and LoadBalancer: reaching the outside

A NodePort Service opens a static (fixed) port on each worker node. Its value must be between 30000 and 32767. The browser request then comes directly to the worker node. A ClusterIP Service is created for it automatically. The Service spans all the worker nodes, so a request can arrive on any node and still reach a Pod on another one.

This is not efficient or secure, because outside clients talk directly to your worker nodes through many open ports.

A LoadBalancer Service is the better option. It uses the cloud provider's own load balancer, such as those from Google Cloud, AWS, Azure, Linode or OpenStack. The NodePort and ClusterIP parts are created automatically. The load balancer becomes the entry point, and it sends traffic to the node port. The course says the node port is not directly reachable from outside; the note below makes that more exact.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> ClusterIP, NodePort and LoadBalancer<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

| Type | Who can reach it | Use it for |
| --- | --- | --- |
| ClusterIP | Only components inside the cluster | Most Services, including those behind Ingress |
| Headless (`clusterIP: None`) | Clients inside the cluster, directly to Pods | Stateful apps and Pod-to-Pod sync |
| NodePort | Anyone who can reach a node's IP and port | Quick tests, not production |
| LoadBalancer | Anyone, through the cloud load balancer | Exposing one app directly in the cloud |

In a real setup, you use Ingress with internal ClusterIP Services, or you use a LoadBalancer Service.

**What has changed.** The Endpoints object still works, but it was [deprecated in Kubernetes 1.33](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/) in favour of EndpointSlices (smaller pieces of the same list). The course also says `type` has three values, but there is a fourth, [ExternalName](https://kubernetes.io/docs/concepts/services-networking/service/), which gives an external DNS name an internal alias (a second name). And the node port of a LoadBalancer Service [stays open on every node](https://www.groundcover.com/learn/networking/loadbalancer-vs-nodeport), so your firewall rules (filters that block unwanted traffic) must stop outsiders from reaching it directly. You can also [turn it off](https://www.kubernetes.dev/resources/keps/1864/) when your load balancer does not need it.

### Real-world stories

- **OpenAI: when the list of Pods becomes the problem.** In a cluster with thousands of nodes, every node watched lists of endpoints. Each change caused enormous updates, sometimes more than 1 GB per second. EndpointSlices cut this load by 1000 times. ([OpenAI](https://openai.com/index/scaling-kubernetes-to-7500-nodes/))
- **OpenAI: the headless idea in action.** OpenAI's training Pods do not use Service load balancing to reach each other. They do a one-time lookup of who is in the job, then talk directly to Pod IPs. As with a headless Service, each Pod needs to reach exact partners. ([OpenAI](https://openai.com/index/scaling-kubernetes-to-7500-nodes/))
- **GitHub: NodePort with a load balancer in front.** The course warns against exposing NodePort directly. GitHub did use NodePort Services in production, but behind its own load balancer, GLB. That is the same shape as the LoadBalancer type, without a cloud provider. ([GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/))

## Recall sheet

Cover the right-hand columns and try to say each one aloud. If you can explain the job in one sentence, you own the concept.

| Component | Its one job | Remember it as |
| --- | --- | --- |
| Node | A server that runs Pods | A worker in a factory |
| Pod | The smallest unit; wraps a container | A wrapper you can throw away |
| Service | Stable address and load balancer | A phone number that never changes |
| Ingress | Routes web traffic by domain and path | The reception desk |
| ConfigMap | Keeps normal settings outside the image | A note on the fridge |
| Secret | Keeps private settings outside the image | A sealed envelope, not a safe |
| Volume | Attaches storage to a Pod | An external hard drive |
| Deployment | Blueprint for stateless Pods | A manager of identical workers |
| ReplicaSet | Keeps the right number of Pods | The assistant you never speak to |
| StatefulSet | Blueprint for Pods with an identity | Named seats, not free seating |
| Namespace | A virtual cluster inside a cluster | One floor of an office building |
| PersistentVolume | A piece of storage in the cluster | A locker |
| PersistentVolumeClaim | A request for storage | A ticket for a locker |
| StorageClass | Creates PersistentVolumes on demand | A machine that builds lockers |
| Helm chart | A package of YAML files | An app-store package |
| API server | The single way in | The front door and its guard |
| Scheduler | Decides which node runs a Pod | The person who assigns seats |
| Controller manager | Detects problems and starts recovery | The night watchman |
| etcd | Stores the cluster state | The brain |
| kubelet | Starts Pods on its node | The foreman on the site |
| kube-proxy | Forwards Service traffic to Pods | The post room |
| Container runtime | Runs the containers | The engine |

### Questions a sceptic will ask you

- **Why not just use Docker?** Docker runs containers. Kubernetes keeps many containers running across many machines, and it replaces them when they fail.
- **Why not call a Pod by its IP address?** Pods are ephemeral. A new Pod gets a new IP, while a Service address stays the same.
- **If a Service balances load, why do I need Ingress?** A Service gives a stable address. Ingress adds a domain name, HTTPS, path routing and one entry point for many Services.
- **Is a Secret secure?** Not by default. Base64 is only an encoding, and Secrets are stored unencrypted unless you turn encryption on.
- **Who starts a Pod, the scheduler or the kubelet?** The scheduler only decides. The kubelet on that node starts the Pod.
- **Does etcd hold my application data?** No. It holds the cluster state. Your application data lives in your own storage.
- **How does self-healing really work?** Kubernetes keeps comparing the specification with the status. Any gap causes a fix.
- **Why not put a database in a Deployment?** Database Pods are not interchangeable. Only one may write, each has its own storage, and each needs a stable identity.
- **If a node dies, is my data safe?** Only if it is on remote storage, and only if you have back-ups. Kubernetes does neither job for you.
- **Why three masters and not two?** etcd needs a majority. Two members survive no failures, and three survive one.
- **Why both a PV and a PVC?** They separate two jobs. The administrator provides the storage, and the developer only asks for what the app needs.
- **What is the difference between `create` and `apply`?** `create` is an order to make something. `apply` describes what you want, and it creates or updates as needed.

### Commands from the course

```bash
# Look around
kubectl get nodes
kubectl get pod -o wide
kubectl get all
kubectl describe pod <pod>
kubectl describe service <service>
kubectl logs <pod>
kubectl exec -it <pod> -- bin/bash

# Create and change
kubectl apply -f <file.yaml>
kubectl delete -f <file.yaml>
kubectl edit deployment <name>
kubectl get deployment <name> -o yaml

# Namespaces
kubectl get namespaces
kubectl get configmap -n my-namespace
kubectl api-resources --namespaced=false

# Minikube and Helm
minikube start
minikube status
minikube service <service>
minikube addons enable ingress
helm install <release> <chart>
helm upgrade <release> <chart>
helm rollback <release>
```

## What has changed since the course

The concepts in this course still hold. These details have moved on since Kubernetes 1.17, or the course simplified them on purpose. They are listed in chapter order and were checked on 6 November 2026.

| Ch. | Topic | The course says | Today, or more exactly |
| --- | --- | --- | --- |
| All | Version | Kubernetes 1.17 | 1.37 is the [newest minor version](https://kubernetes.io/releases/1.37/), released on 26 August 2026 |
| 2 | Secrets | Stored in base64 format | Base64 is not encryption, and Secrets are [unencrypted by default](https://www.kubernetes.io/docs/concepts/security/secrets-good-practices/) |
| 2, 3 | Service routing | Least busy Pod, or a replica on the same node | [Random by default](https://kubernetes.io/docs/reference/networking/_print/); nearby routing is [optional](https://www.cloudkeeper.com/insights/blog/kubernetes-135-understanding-prefersamenode-and-prefersamezone-traffic-distribution) |
| 2, 12 | Database storage | Clones share one storage | Each Pod keeps its own copy, as the course itself says in its StatefulSet part |
| 3 | Node names | Master and slave | Control plane node and worker node; the `master` label [went in 1.24](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/) |
| 3 | Control flow | Components hand requests to each other | Components [watch the API server](https://v1-30.docs.kubernetes.io/docs/concepts/overview/components) |
| 3 | Small cluster | Two masters | Three, because [etcd needs a majority](https://etcd.io/docs/v3.5/faq/) |
| 3, 4 | Runtime | Docker | [Dockershim was removed in 1.24](https://kubernetes.io/blog/2022/02/17/dockershim-faq); runtimes are usually containerd or CRI-O |
| 3, 4 | Dashboard | A normal UI client | [Archived on 21 January 2026](https://github.com/kubernetes-retired/dashboard); [Headlamp](https://kubernetes.io/blog/2026/06/01/dashboard-to-headlamp/) is the suggested replacement |
| 4 | Minikube | `--vm-driver` and a hypervisor | [`--driver`](https://cncfstack.com/minikube-doc/cmd/minikube-start.html), and the [Docker driver](https://minikube.sigs.k8s.io/docs/drivers/docker/) needs no hypervisor on Linux |
| 7 | Mongo Express | `ME_CONFIG_MONGODB_SERVER` | Newer images use [`ME_CONFIG_MONGODB_URL`](https://github.com/mongo-express/mongo-express-docker) |
| 8 | Active namespace | Needs the `kubens` tool | [`kubectl config set-context --current --namespace=...`](https://v1-34.docs.kubernetes.io/docs/concepts/overview/working-with-objects/namespaces) is built in |
| 9 | Ingress format | An older format | `networking.k8s.io/v1`, with a [required `pathType`](https://kubernetes.io/docs/concepts/services-networking/ingress/) and [`ingressClassName`](https://v1-35.docs.kubernetes.io/docs/concepts/services-networking/ingress-controllers/) |
| 9 | Ingress direction | Ingress with the Nginx controller | The API is [frozen](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/), Gateway API is recommended, and Ingress NGINX was [retired in March 2026](https://opensource.googleblog.com/2026/02/the-end-of-an-era-transitioning-away-from-ingress-nginx.html) |
| 10 | Chart sources | Helm Hub and stable charts | [Artifact Hub](https://blog.helm.sh/community/stable-repo-charts-new-locations), with charts held by their owners |
| 10 | Helm version | Helm 3 is the new version | [Helm 4 arrived in November 2025](https://helm.sh/blog/helm-v3-end-of-life); Helm 3 gets security fixes until 10 February 2027 |
| 10 | `helm install` | `helm install <chartname>` | A [release name is required](https://blog.helm.sh/docs/faq/changes_since_helm2) |
| 11 | Storage | Provisioners such as `kubernetes.io/aws-ebs` | The AWS one was [removed in 1.27](https://kubernetes.io/docs/concepts/storage/storage-classes); use CSI drivers |
| 12 | StatefulSet deletion | Always in reverse order | Guaranteed for scaling down, [not for deleting the whole StatefulSet](https://v1-31.docs.kubernetes.io/docs/concepts/abstractions/controllers/statefulsets) |
| 13 | Endpoints object | Tracks a Service's Pods | [Deprecated in 1.33](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/) in favour of EndpointSlices |
| 13 | Service types | Three values | There is a fourth, [ExternalName](https://kubernetes.io/docs/concepts/services-networking/service/) |
| 13 | LoadBalancer node port | Reachable only through the load balancer | [Stays open on every node](https://www.groundcover.com/learn/networking/loadbalancer-vs-nodeport), so firewall rules must block direct access |

## Sources

The main source is your course transcript. Example names and values in the drawings stay close to it, and captions say where a value is only an example. Every story above links to its own source.

**Opened and read:**

- [You Broke Reddit: The Pi-Day Outage](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/) (read through a mirror copy)
- [OpenAI: Scaling Kubernetes to 7,500 nodes](https://openai.com/index/scaling-kubernetes-to-7500-nodes/)
- [GitHub: Kubernetes at GitHub](https://github.blog/engineering/infrastructure/kubernetes-at-github/)
- [Monzo: outage post-mortem](https://community.monzo.com/t/resolved-current-account-payments-may-fail-major-outage-27-10-2017/26296/95)
- [Zalando: Postgres Operator, one year later](https://engineering.zalando.com/posts/2018/11/postgres-operator.html)
- [Chick-fil-A: Enterprise Restaurant Compute](https://medium.com/chick-fil-atech/enterprise-restaurant-compute-f5e2fd63d20f)
- [eWeek: Chick-fil-A, Kubernetes and GitOps](https://eweek.com/?p=8990)
- [ITPro: Pokémon GO traffic](https://www.itpro.com/cloud/363071/pokemon-gos-google-cloud-was-hit-by-50x-expected-server-traffic)
- [CSO Online: MongoDB ransom attacks](https://www.csoonline.com/article/559459/exposed-mongodb-installs-being-erased-held-for-ransom.html)
- [Trend Micro: Tesla and Jenkins cryptominers](https://www.trendmicro.com/vinfo/fr/security/news/cybercrime-and-digital-threats/tesla-and-jenkins-servers-fall-victim-to-cryptominers)
- [Google Open Source: transitioning away from Ingress NGINX](https://opensource.googleblog.com/2026/02/the-end-of-an-era-transitioning-away-from-ingress-nginx.html)
- [Bitnami: catalogue changes](https://github.com/bitnami/charts/issues/35164)
- [Helm: Helm 3 end of life](https://helm.sh/blog/helm-v3-end-of-life)
- [etcd FAQ](https://etcd.io/docs/v3.5/faq/)
- [groundcover: LoadBalancer vs NodePort](https://www.groundcover.com/learn/networking/loadbalancer-vs-nodeport)

**Checked through search previews only.** These pages could not be opened from here, so check them yourself before you quote exact wording:

- [Kubernetes documentation](https://kubernetes.io/docs/) pages for Secrets, Namespaces, StatefulSets, Services, Ingress, storage classes and components, and the [Kubernetes 1.37 release page](https://kubernetes.io/releases/1.37/)
- Kubernetes blog posts on [dockershim](https://kubernetes.io/blog/2022/02/17/dockershim-faq), [Endpoints](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/) and [Headlamp](https://kubernetes.io/blog/2026/06/01/dashboard-to-headlamp/)
- [Google Cloud: Bringing Pokémon GO to life](https://cloud.google.com/blog/products/containers-kubernetes/bringing-pokemon-go-to-life-on-google-cloud)
- [CNCF: adidas case study](https://www.cncf.io/case-study/adidas/) and the [Kubernetes adidas case study](https://kubernetes.io/vi/case-studies/adidas/)
- [SecurityWeek](https://www.securityweek.com/ingressnightmare-flaws-expose-many-kubernetes-clusters-to-remote-hacking/amp/) and [SUSE](https://www.suse.com/c/rancher_blog/ending-the-ingressnightmare-how-suse-secures-your-kubernetes-clusters-from-external-and-internal-threats) on IngressNightmare
- [Helm: stable repository deprecation](https://helm.sh/blog/charts-repo-deprecation), [Helm: changes since Helm 2](https://v3.helm.sh/docs/faq/changes_since_helm2) and [stable chart locations](https://blog.helm.sh/community/stable-repo-charts-new-locations)
- [Minikube Docker driver](https://minikube.sigs.k8s.io/docs/drivers/docker/), [mongo-express-docker](https://github.com/mongo-express/mongo-express-docker), [Kubernetes Dashboard](https://github.com/kubernetes-retired/dashboard), [KEP-1864 on node ports](https://www.kubernetes.dev/resources/keps/1864/) and [Cloudkeeper on traffic distribution](https://www.cloudkeeper.com/insights/blog/kubernetes-135-understanding-prefersamenode-and-prefersamezone-traffic-distribution)
- Early copies of the Zalando Postgres Operator README ([one](https://github.com/nboukeffa/postgres-operator), [two](https://github.com/theRealWardo/postgres-operator)), which are forks of the original project
