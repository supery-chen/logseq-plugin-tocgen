import { t } from "logseq-l10n"
import { useEffect, useMemo, useRef, useState } from "preact/hooks"
import { none } from "rambdax"
import { cls } from "reactutils"
import { HeadingTypes, isHeading, parseContent } from "../utils.js"
import Arrow from "./Arrow.jsx"

export default function Block({
  root,
  block,
  levels,
  headingType,
  blocksToHighlight,
  hidden,
  collapsed,
  onCollapseChange,
}) {
  console.log("block", block)
  const blockContent = block.content
  let hn = ""
  if (blockContent.startsWith("# ")) {
    hn = "h1"
  } else if (blockContent.startsWith("## ")) {
    hn = "h2"
  } else if (blockContent.startsWith("### ")) {
    hn = "h3"
  } else if (blockContent.startsWith("#### ")) {
    hn = "h4"
  } else if (blockContent.startsWith("##### ")) {
    hn = "h5"
  } else if (blockContent.startsWith("###### ")) {
    hn = "h6"
  }
  console.log("hn", hn)

  const [content, setContent] = useState("")
  const [childrenCollapsed, setChildrenCollapsed] = useState(
    () =>
      block.children.reduce((status, block) => {
        status[block.id] =
          (logseq.settings?.defaultExpansionLevel ?? 1) <= block.level
        return status
      }, {}),
    [block.children],
  )

  useEffect(() => {
    setChildrenCollapsed((values) =>
      block.children.reduce((status, block) => {
        status[block.id] =
          values[block.id] ??
          (logseq.settings?.defaultExpansionLevel ?? 1) <= block.level
        return status
      }, {}),
    )
  }, [block.children])

  const page = useMemo(async () => {
    if (root.page) {
      return await logseq.Editor.getPage(root.page.id)
    } else {
      return root
    }
  }, [root.name, root.page?.id])
  const subblocksRef = useRef()
  const [noChildren, setNoChildren] = useState(true)

  useEffect(() => {
    ;(async () => {
      setContent(await parseContent(block.content))
    })()
  }, [block])

  useEffect(() => {
    setTimeout(() => {
      if (subblocksRef.current?.childElementCount > 1) {
        setNoChildren(false)
      }
    }, 20)
  }, [collapsed])

  async function goTo(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar((await page).uuid)
    } else {
      logseq.Editor.scrollToBlockInPage((await page).name, block.uuid)
    }
  }

  function goInto(e) {
    if (e.shiftKey) {
      logseq.Editor.openInRightSidebar(block.uuid)
    } else {
      logseq.Editor.scrollToBlockInPage(block.uuid)
    }
  }

  function toggleCollapsed() {
    onCollapseChange?.(block.id, !collapsed)
  }

  function toggleCollapseChildren() {
    if (
      block.children.some(
        (block) =>
          !childrenCollapsed[block.id] &&
          block.level < levels &&
          (headingType === HeadingTypes.h
            ? block.children.some((subblock) => isHeading(subblock))
            : block.children.length > 0),
      )
    ) {
      setChildrenCollapsed(
        block.children.reduce((status, block) => {
          status[block.id] = true
          return status
        }, {}),
      )
    } else {
      setChildrenCollapsed(
        block.children.reduce((status, block) => {
          status[block.id] = false
          return status
        }, {}),
      )
    }
  }

  function onBlockCollapseChange(blockId, blockCollapsed) {
    setChildrenCollapsed((old) => ({
      ...old,
      [blockId]: blockCollapsed,
    }))
  }

  if (hidden) return null

  // Hide blocks with 'toc:: no' property, empty blocks and render/macro blocks.
  if (
    block.properties?.toc === "no" ||
    !content ||
    /^\s*{{/.test(content) ||
    (headingType === HeadingTypes.h && !isHeading(block))
  )
    return null

  const arrowCollapsed =
    collapsed &&
    block.level < levels &&
    (headingType === HeadingTypes.h
      ? block.children.some((subblock) => isHeading(subblock))
      : block.children.filter((subblock) => subblock.properties?.toc !== "no")
          .length > 0)
  hn = "kef-tocgen-into inline " + hn
  return (
    <>
      <div
        class={cls(
          "kef-tocgen-block",
          blocksToHighlight?.has(block.id) && "kef-tocgen-active-block",
        )}
      >
        <button class="kef-tocgen-arrow" onClick={toggleCollapsed}>
          <Arrow
            class={cls(
              !arrowCollapsed && noChildren && "kef-tocgen-arrow-hidden",
            )}
            style={{
              transform: arrowCollapsed ? null : "rotate(90deg)",
            }}
          />
        </button>
        <span
          class={hn}
          data-ref={block.uuid}
          onClick={goInto}
          dangerouslySetInnerHTML={{ __html: content }}
        ></span>
        {!logseq.settings?.noPageJump && (
          <button class="kef-tocgen-to" onClick={goTo}>
            {t("page")}
          </button>
        )}
      </div>
      {block.level < levels && (
        <div class="kef-tocgen-block-children" ref={subblocksRef}>
          <div
            className="kef-tocgen-block-collapse"
            onClick={toggleCollapseChildren}
          />
          {block.children.map((subBlock) => (
            <Block
              key={subBlock.id}
              root={root}
              block={subBlock}
              levels={levels}
              headingType={headingType}
              blocksToHighlight={blocksToHighlight}
              hidden={collapsed}
              collapsed={childrenCollapsed[subBlock.id]}
              onCollapseChange={onBlockCollapseChange}
            />
          ))}
        </div>
      )}
    </>
  )
}
