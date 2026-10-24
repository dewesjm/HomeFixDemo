# Configurable added routing definitions and insertion

Status: package 1 implemented; stopped for review. Generic insertion and packages 2-4 remain deferred. Select this work explicitly and deliver one agreed package at a time, with a local commit and review after each. [Tasks.md](Tasks.md) is the master backlog.

## Intended result

Administrators can create a routing in **Added routings**, configure its signoff behavior, and select it as an insertion target in routing rules. Signing a routing that matches such a rule inserts an instance immediately after it and makes that instance current. A new runtime routing does not become part of every new joint's numbered path.

Example: create an additional inspection definition, assign its Type/form and persona, then configure a reject or accepted-signoff rule to insert it. Its own accepted/rejected rules decide what happens next. The administrator must not need a new hardcoded routing ID for each ordinary additional inspection.

## Current behavior and gap

- Routing Settings configures inclusion, rejection, accepted-signoff destinations and conditional personas. Repair, Excavation NDT and Engineering Hold are editable in its Added routings section.
- Add routing creates a regular numbered routing. Added routing definitions are currently a fixed list in added-stage-templates.ts, identified by isAddedTemplateId(). There is no create-added-routing action.
- Rule targets and execution recognize specific Add Repair, Add Excavation NDT and Add Engineering Hold operations. They do not resolve an arbitrary saved definition as an insertion target.
- Repair creates a numbered repair round and captures its rejecting inspection/phase. Excavation belongs to that Repair, inherits inspection context and may replace its Type. Engineering Hold has a blocking/release workflow. These lifecycle responsibilities remain specialized even when their settings are editable.
- Excavation currently uses conditional Persona rules: NQC Inspector for Nuclear Indicator 1/2, Inspector otherwise. That is persona selection on one definition; it does not create a separate NQC definition.

## Required admin capabilities

1. Provide **Add added routing** within the Added routings section, distinct from Add routing for the numbered path. Make the distinction explicit in labels/help text.
2. Create a definition with a stable internal ID, routing name, display name, base persona, optional ordered Persona rules, and applicability conditions using the existing condition editor.
3. Configure offered Signoff Types, default/enable conditions and the form via the existing Signoff Types / Signoff Types By Routing / Signoff Type Forms owners. An added routing should not require a separate form system. Surface links or a short setup summary so its configuration can be completed.
4. Configure accepted-signoff and reject rules with the existing ordered editor. The first matching rule wins. Show an explicit default outcome where no rule matches.
5. Offer eligible saved definitions as **Insert <routing name>** targets in accepted-signoff and reject rules. The target stores the stable definition ID, not a name or a runtime instance ID. Renaming must preserve references.
6. Show and export applicability, persona conditions, Type source/options and insertion destinations with readable headings. Use the standard toolbar, clearable filters and shared pager if the list is paginated.
7. Support save/cancel, reopen and reload. Validate configuration before saving or activating an incomplete insertion target. Allow a draft definition to be completed without making an unusable routing executable.

## Definition model and execution responsibilities

### Definitions and instances

- Persist numbered-versus-added classification explicitly. Do not identify added definitions solely from a hardcoded ID list. Existing built-in IDs remain stable.
- Give every inserted instance a unique identity and a stable link to its definition. Capture its insertion source, relevant phase, rejecting inspection and parent round where applicable. Repeated instances must not overwrite or collide with earlier records.
- Keep ordinary runtime-instance numbering distinct from Repair # and Refit #. Repeated display labels and History must make the specific instance identifiable.
- Resolve the applicable definition, persona, Type choices and context before insertion, using the same resolver for live execution, seeded examples and preview. Filter inapplicable definitions and reject invalid targets predictably; do not silently mark anything signed.
- New instances start with blank user inputs and unsigned state. Copy only explicitly defined context/bookkeeping. Insert immediately after the triggering routing, then make the inserted instance current.
- Define how multiple insertion requests from one signoff interact. Start with one destination from the first matching routing rule; do not accidentally turn Additional Signoffs into insertion rules or insert every matching rule.

### Ordinary and specialized lifecycle behavior

Provide an ordinary added-signoff lifecycle driven by its Type/form, persona and destinations. Keep the following special mechanisms in their existing domain owners:

| Existing type | Specialized responsibilities to preserve |
|---|---|
| Repair | Repair round identity, origin inspection/phase, Repair #, Cut/Refit and fabrication reset |
| Excavation NDT | Link to its own Repair, original/performed inspection context, inheritance and exceptions, return to that round on UNSAT |
| Engineering Hold | Hold reason/deviation association, blocking later work, Engineering release form and chosen disposition destination |

Model these as explicit supported behaviors rather than branching on display names. Do not offer administrators arbitrary new lifecycle mechanics merely by adding an option. A custom definition can use the ordinary lifecycle; exposing a specialized behavior on another definition needs a clearly defined contract and validation.

### Destinations and context

- Preserve existing relative destinations: Own Repair, Rejecting NDT, Rejecting phase's VT/5X and UT/RT. Offer them only where the required context can be resolved.
- For a generic added routing, specify supported destinations such as continue after the inserted work, a named numbered routing, or another configured insertion. Define what “continue” means when the source was itself an inserted instance.
- Preserve the original rejecting inspection even when the performed inspection Type is replaced. Reuse that context for later returns and exceptions rather than encoding one PT-to-5X case.
- Validate missing/deactivated definitions, unavailable Types, invalid relative targets and direct or indirect unconditional insertion cycles. Deliberate repeat work needs explicit rules and distinct instances; accidental unlimited insertion must not arise from an invalid configuration.

## NQC Excavation NDT

Potential requirement raised for this scope: provide a separate **NQC Excavation NDT** definition based on Nuclear Indicator, consistent with the regular/NQC numbered inspection rows.

- Proposed applicability: NQC Excavation NDT for indicators **1/2**; regular Excavation NDT for indicator **3**.
- NQC definition defaults to NQC Inspector; regular definition defaults to Inspector. Keep their configuration independently editable where needed, including offered Types and conditions. They may share inspection Type forms.
- A Repair's Insert Excavation target should resolve the applicable regular/NQC definition from configuration rather than duplicate fixed nuclear checks inside insertion code. Decide whether the editor uses a shared logical target with conditional variants or explicit ordered insertion rules. Both must remain understandable in preview and exported settings.
- Both variants must retain the parent Repair identity and original inspection, apply configured Type-source/material exceptions, return to their own Repair on rejection, and return to the correct regular/NQC phase inspection on acceptance.
- Decide the routing-bar display name separately from the admin definition name; matching regular/NQC display names is consistent with existing numbered inspections. History must retain the actual instance/persona and inspection.
- Confirm the separate-definition requirement and any distinct NQC Type/inspection rules before implementation. The present Persona rules already select the right signer, but do not satisfy independent NQC definition configuration by themselves.

## Related Type-exception work

The current Excavation-specific Type exception section could become a shared **Type Exceptions** list selecting routing, original Type, replacement Type and conditions. Keep Type source a per-routing setting: ordinary configured options versus rejecting inspection where context exists. Apply replacements consistently to enabled choices, preview, insertion and repair returns. Track this linked scope explicitly; generic insertion must not accidentally bypass Type enable conditions or duplicate exception evaluation.

## Persistence, historical behavior and removal

- Keep configuration persistence in its existing configuration owners and workflow persistence in WorkflowStore. Follow the project's version-change rules when definitions or persisted instance models change; document whether release resets demo caches or migrates them.
- Saved settings affect future instances. Existing signed instances and History retain their recorded identity, labels, persona, values and source context. Specify separately whether open unsigned instances adopt new settings; do not silently rewrite signed records.
- Deactivate referenced definitions rather than delete them. Detect references from destinations, Type mappings and variants; retain lookup/display support for historical instances. Explain why a referenced definition cannot be removed.
- Keep repair/excavation relationships and counters intact through routing back, Cut, corrections and Deprogress. Never un-sign an existing stage; fresh instances/reset behavior must follow ROUTING.md.

## Suggested implementation packages

1. **Definition classification and CRUD (complete):** persist added definitions, preserve built-ins, add the create/edit/deactivate UI, establish Type/form setup and validation. No generic insertion claims until execution is delivered.
2. **Generic insertion and preview:** stable definition targets, instance/context model, applicability, persona/Type resolution, default outcomes and relative destinations. Prove live execution and preview agree.
3. **Existing specialized types and NQC Excavation:** preserve Repair/Excavation/Hold contracts; implement the agreed NQC variant selection through configuration and cover round returns.
4. **Shared Type Exceptions and configuration clarity:** if selected for the same initiative, replace the Excavation-only editor/resolver with a general list and add readable effective-path summaries.

Review package boundaries before starting. Deliver each as a concrete, verified change and stop for review; this plan is not authorization to start all packages.

## Acceptance and verification

- Create a custom added definition, configure its Type/form/persona, select it in a rule, save/reload, trigger it and sign it. It is absent from a new joint's ordinary numbered path and appears exactly when the rule requests it.
- Show the same destination/persona/Type choices in preview and actual execution. No match, disabled Type, inapplicable definition and invalid context produce a clear supported outcome.
- Insert the same definition more than once without identity collisions or lost History. Test nested insertion/continuation and configuration-cycle validation.
- Exercise regular/NQC Excavation for indicators 1/2/3, PT-to-5X/material exceptions, SAT/UNSAT, multiple Repair rounds and correct Own Repair / phase-inspection returns.
- Preserve thickness-rule priority, Grind Only, Weld Repair, Cut/fabrication reset, Repair #/Refit #, accepted deviations and Engineering release behavior.
- Test Deprogress and route-back with generic instances and each specialized lifecycle. Prior signed records remain intact; current routing and restored counters/context are correct.
- Verify admin save/cancel/reload, rename/deactivate references, export contents, accessible labels/keyboard operations and use of the standard table conventions.
- Add focused rule/service tests plus representative rendered editor and execution journeys. Run production build, unused-code checks and affected/full cross-cutting suites. Do not begin the separate deferred coverage program automatically.

## Package 1 delivered

Routing Settings creates custom Added routing definitions as drafts with stable IDs, names/display names, personas, applicability and ordered persona/destination rules. Numbered-versus-added classification, supported lifecycle and draft/active/inactive status are persisted. Legacy saved built-ins infer classification/lifecycle from their stable IDs; existing custom numbered routings remain numbered.

The existing Signoff Types By Routing editor offers new definitions. Setup links lead to the existing Type, availability and form editors. Activation validates a signing persona, offered known Types, no more than one default, shared forms, and Types that sign this routing. Conditional Type availability is shown in the setup/export summary; runtime applicability and Type availability remain package 2 work. Missing configuration is retained as a draft. Custom definitions can be deactivated and reactivated; removal is blocked for all added definitions to preserve references. Built-in specialized lifecycle definitions stay available.

Package 1 does not offer custom insertion targets or change live Repair, Excavation or Engineering Hold execution. Active custom definitions are prepared configuration only. Their applicability and destination rules are editable in advance; they do not put the routing on a new joint. Generic instance identity, context, execution, previews and cycle validation remain package 2. Separate NQC Excavation and shared Type Exceptions remain decisions for later packages.

Workflow version 2.10.55 uses the existing demo cache reset on first load after upgrade, including saved configuration/workflows. No historical instance migration is needed because custom runtime instances cannot yet be created.
