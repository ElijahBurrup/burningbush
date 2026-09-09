# Burning Bush — working notes for Claude

The project itself is documented in [README.md](README.md): layout, build, tests, deploy.
This file is how we work, not what the code is.

## Handing work back and forth

**Instructions written for the user contain only the steps that genuinely need a person.**
Anything that can be done from a terminal, a file, an API or a repo is not their work: it is the
assistant's, and putting it in a list for them to type is offloading effort rather than saving it.

A person is genuinely needed for: a browser login or OAuth consent, a dashboard that has no API,
a payment, a decision only they can make, a credential only they hold, and anything physical.

**Stop at the handback and name it.** The list ends at the first point where what the user has —
a connection string, a key, a confirmation that a service is live — lets the assistant carry on.
Say what to send back and stop. Do not continue the list past that boundary with steps the
assistant will be doing anyway once it has the answer.

**Do not front-load what is not needed yet.** Requirements that only matter after the next handback
are not mentioned until the user's own involvement is actually required for them. A runbook that
lists everything that will ever be needed reads as a wall and buries the one thing to do now.

Concretely, when a step produces something the assistant needs:

> **You:** copy the external connection string from Render → kb-playbooks-db → Connect, and paste it
> here.
>
> **Then I will:** write the .env, verify the connection, run the import, and confirm what landed.

and NOT a numbered list telling the user to write the file, run the importer and check the output
themselves.
