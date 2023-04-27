import { Component, ParentProps } from 'solid-js'
import TimelineButton from './TimelineButton'
import TimelineContent from './TimelineContent'
import TimelineIcon from './TimelineIcon'
import TimelineItem from './TimelineItem'
import TimelineTime from './TimelineTime'
import TimelineTitle from './TimelineTitle'

interface TimelineSubComponents {
  Item: typeof TimelineItem
  Icon: typeof TimelineIcon
  Title: typeof TimelineTitle
  Time: typeof TimelineTime
  Content: typeof TimelineContent
  Button: typeof TimelineButton
}

const Timeline: Component<ParentProps> & TimelineSubComponents = (props) => {
  return <ol class="relative ml-3 border-l border-gray-300 dark:border-gray-700">{props.children}</ol>
}

Timeline.Item = TimelineItem
Timeline.Icon = TimelineIcon
Timeline.Title = TimelineTitle
Timeline.Time = TimelineTime
Timeline.Content = TimelineContent
Timeline.Button = TimelineButton

export default Timeline
