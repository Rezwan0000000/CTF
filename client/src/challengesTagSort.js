import React from 'react';
import { Layout, List, message, Modal, Tag, Input, Button, Tabs, Avatar, Form, notification, Tooltip } from 'antd';
import {
  UnlockOutlined,
  ProfileOutlined,
  FlagOutlined,
  SmileOutlined,
  ExclamationCircleOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import './App.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import JsxParser from 'react-jsx-parser';
import { Link } from 'react-router-dom';
import ChallengesTagSortList from './challengesTagSortList.js';
import { orderBy } from 'lodash';


const { TabPane } = Tabs;
const { confirm } = Modal;

const SubmitFlagForm = (props) => {
  const [form] = Form.useForm();

  return (
    <Form
      form={form}
      name="submit-flag"
      className="submit-flag-form"
      onFinish={(values) => { props.submitFlag(values); form.resetFields() }}
      style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "2vh" }}
    >
      <Form.Item
        name="flag"
        rules={[{ required: true, message: 'Hint: Flags are not blank.' }]}>
        <Input disabled={props.currentChallengeSolved} style={{ width: "45ch" }} placeholder={props.currentChallengeStatus} />
      </Form.Item>
      <Form.Item>
        <Button disabled={props.currentChallengeSolved} type="primary" htmlType="submit" icon={<FlagOutlined />}>Submit</Button>
      </Form.Item>
    </Form>
  );
}


class ChallengesTagSort extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      challenges: [],
      challengeModal: false,
      currentChallenge: "",
      currentChallengeStatus: "",
      viewingChallengeDetails: {
        name: "",
        category: this.props.category,
        description: "",
        points: 0,
        author: "",
        created: "",
        solves: [],
        max_attempts: 0,
        tags: [],
        hints: [],
      },
      challengeTags: [],
      loadingChallenge: false,
      currentChallengeSolved: false,
      challengeHints: [],
      attemptsLeft: "",
      hintContent: "",
      hintModal: false,
      currentSorting: "points",
      tag: false,
      loadingTag: false,
      challengeWriteup: ""

    };
  }

  componentDidMount() {
    const startup = async () => {
      await this.sortByTags()
    }

    startup()
  }

  sortByTags() {

    let originalData = this.props.tagData
    let tag = {}
    this.setState({ loadingTag: true })


    for (const [key, value] of Object.entries(originalData)) {
      let currentCat = originalData[key]
      for (let x = 0; x < currentCat.length; x++) { //loop through each challenge

        if ("tags" in currentCat[x]) {
          const firstTag = currentCat[x].tags[0]
          if (firstTag.toLowerCase() in tag) {
            tag[firstTag.toLowerCase()].push(currentCat[x]) //add current challenge to that tag's category
          }
          else {
            tag[firstTag.toLowerCase()] = []
            tag[firstTag.toLowerCase()].push(currentCat[x])
          }

        }
      }
    }

    for (const [key, value] of Object.entries(tag)) {
      tag[key] = orderBy(tag[key], ['points'], ['asc'])

    }
    console.log(tag)
    this.setState({ tag: tag, loadingTag: false })

  }

  handleBuyHint(close, id, chall) {
    fetch(window.ipAddress + "/v1/challenge/hint", {
      method: 'post',
      headers: { 'Content-Type': 'application/json', "Authorization": localStorage.getItem("IRSCTF-token") },
      body: JSON.stringify({
        "id": parseInt(id),
        "chall": chall,
      })
    }).then((results) => {
      return results.json(); //return data in JSON (since its JSON data)
    }).then((data) => {
      //console.log(data)
      if (data.success === true) {
        message.success({ content: "Purchashed hint " + String(id + 1) + " successfully!" })
        let challengeHints = this.state.challengeHints
        challengeHints[id] = (
          <Button type="primary" key={"hint" + String(id)} style={{ marginBottom: "1.5vh", backgroundColor: "#49aa19" }} onClick={() => { this.handleHint(id, chall, true) }}>Hint {id + 1} - Purchased</Button>
        )
        this.setState({ hintModal: true, hintContent: data.hint, challengeHints: challengeHints })
        close()
      }
    }).catch((error) => {
      console.log(error)
      message.error({ content: "Oops. There was an issue connecting to the server" });
      close()
    })
  }

  handleHint(id, chall, bought) {

    if (bought === false) {
      confirm({
        title: 'Are you sure you want to purchase hint ' + parseInt(id + 1) + ' for "' + chall + '"?',
        icon: <ExclamationCircleOutlined />,
        onOk: (close) => { this.handleBuyHint(close.bind(this), id, chall) },
        onCancel() { },
      });
    }
    else {
      fetch(window.ipAddress + "/v1/challenge/hint", {
        method: 'post',
        headers: { 'Content-Type': 'application/json', "Authorization": localStorage.getItem("IRSCTF-token") },
        body: JSON.stringify({
          "id": parseInt(id),
          "chall": chall,
        })
      }).then((results) => {
        return results.json(); //return data in JSON (since its JSON data)
      }).then((data) => {
        //console.log(data)
        if (data.success === true) {
          this.setState({ hintModal: true, hintContent: data.hint })
        }
      }).catch((error) => {
        console.log(error)
        message.error({ content: "Oops. There was an issue connecting to the server" });
      })
    }

  }

  loadChallengeDetails = async (name, solved) => {
    await this.setState({ currentChallenge: name, loadingChallenge: true, currentChallengeSolved: solved, tagList: this.state.tagLists })
    if (solved === true) {
      this.setState({ currentChallengeStatus: "Challenge already solved." })
    }
    else {
      this.setState({ currentChallengeStatus: "Enter the flag (case-sensitive)" })
    }
    //document.getElementById(name).style.pointerEvents = "none"
    fetch(window.ipAddress + "/v1/challenge/show/" + encodeURIComponent(name), {
      method: 'get',
      headers: { 'Content-Type': 'application/json', "Authorization": localStorage.getItem("IRSCTF-token") },
    }).then((results) => {
      return results.json(); //return data in JSON (since its JSON data)
    }).then((data) => {
      console.log(data)
      if (data.success === true) {

        //Replace <code> with syntax highlighter
        let description = data.chall.description
        let position = description.search("<code>")

        if (position !== -1) {
          let language = ""
          let offset = 0
          position += 6

          while (true) {
            let currentLetter = description.slice(position + offset, position + offset + 1)
            if (currentLetter === "\n") {
              language = description.slice(position, position + offset)
              description = description.slice(0, position) + description.slice(position + offset)
              description = description.replace("<code>", "<SyntaxHighlighter language='" + language + "' style={atomDark}>{`")
              description = description.replace("</code>", "`}</SyntaxHighlighter>")
              data.chall.description = description
              break
            }
            else if (offset > 10) {
              break
            }
            offset += 1
          }


        }


        //Handle unlimited attempts
        if (data.chall.max_attempts === 0) {
          data.chall.max_attempts = "Unlimited"

        }
        else {
          data.chall.max_attempts = String(data.chall.max_attempts - data.chall.used_attempts) + "/" + String(data.chall.max_attempts)
        }

        //Render tags
        if (typeof data.chall.tags !== "undefined") {
          const tag = data.chall.tags
          var renderTags = []

          for (let x = 0; x < tag.length; x++) {
            renderTags.push(
              <Tag color="#1765ad" key={tag[x]}>
                {tag[x]}
              </Tag>
            )
          }
        }

        //Render writeup link
        let writeupLink = ""
        if (typeof data.chall.writeup !== "undefined") {
          writeupLink = data.chall.writeup
        }
        else writeupLink = ""


        //Handle hints
        if (typeof data.chall.hints !== "undefined") {
          const hints = data.chall.hints
          var renderHints = []

          for (let y = 0; y < hints.length; y++) {
            if (hints[y].bought === false) {
              if (hints[y].cost === 0) {
                hints[y].cost = "Free"
              }
              else {
                hints[y].cost = String(hints[y].cost) + " Points"
              }
              renderHints.push(
                <Button type="primary" key={hints[y].cost} style={{ marginBottom: "1.5vh" }} onClick={() => { this.handleHint(y, name, false) }}>Hint {y + 1} - {hints[y].cost}</Button>
              )
            }
            else {
              renderHints.push(
                <Button type="primary" key={hints[y].cost} style={{ marginBottom: "1.5vh", backgroundColor: "#49aa19" }} onClick={() => { this.handleHint(y, name, true) }}>Hint {y + 1} - Purchased</Button>
              )
            }

          }
        }


        this.setState({ viewingChallengeDetails: data.chall, challengeModal: true, challengeTags: renderTags, challengeWriteup: writeupLink, loadingChallenge: false, challengeHints: renderHints })

      }
      else {
        message.error({ content: "Oops. Unknown error" })
      }
      //document.getElementById(name).style.pointerEvents = "auto"


    }).catch((error) => {
      console.log(error)
      message.error({ content: "Oops. There was an issue connecting with the server" });
    })
  }

  submitFlag(values) {

    fetch(window.ipAddress + "/v1/challenge/submit", {
      method: 'post',
      headers: { 'Content-Type': 'application/json', "Authorization": localStorage.getItem("IRSCTF-token") },
      body: JSON.stringify({
        "flag": values.flag,
        "chall": this.state.currentChallenge,
      })
    }).then((results) => {
      return results.json(); //return data in JSON (since its JSON data)
    }).then((data) => {
      //console.log(data)
      if (data.success === true) {
        if (data.data === "correct") {
          notification["success"]({
            message: 'Challenge Solved! Congratulations!',
            description:
              'Congratulations for solving "' + this.state.currentChallenge + '".',
            duration: 0
          });
          const refresh = async () => {
            await this.props.handleRefresh(true)
            await this.sortByTags()

          }
          refresh()

        }
        else {
          notification["error"]({
            message: 'Oops. Incorrect Flag',
            description:
              'It seems like you submitted an incorrect flag (' + values.flag + ') for "' + this.state.currentChallenge + '".',
            duration: 0
          });
        }
      }
      else {
        if (data.error === "exceeded") {
          notification["error"]({
            message: 'Oops. Attempts Exhausted',
            description:
              'It seems like you have execeeded the maximum number of attempts for "' + this.state.currentChallenge + '". Contact an admin if you need more tries',
            duration: 0
          });
        }
        else {
          message.error({ content: "Oops. Unknown error" })
        }
      }
    }).catch((error) => {
      console.log(error)
      message.error({ content: "Oops. There was an issue connecting to the server" });
    })
  }

  render() {
    return (
      <Layout className="pageTransition" style={{ height: "100%", width: "100%", backgroundColor: "rgba(0, 0, 0, 0)" }}>

        <Modal
          title="Hint"
          visible={this.state.hintModal}
          onCancel={() => { this.setState({ hintModal: false }) }}
          footer={null}
        >
          <p>{this.state.hintContent}</p>
        </Modal>


        <Modal
          title={null}
          visible={this.state.challengeModal}
          footer={null}
          bodyStyle={{ textAlign: "center" }}
          onCancel={() => { this.setState({ challengeModal: false }) }}
        >
          <Tabs defaultActiveKey="challenge">
            <TabPane
              tab={<span><ProfileOutlined /> Challenge</span>}
              key="challenge"
            >
              {this.state.challengeWriteup !== "" && (
                <Tooltip title="View writeups for this challenge">
                  <Button shape="circle" size="large" style={{ position: "absolute", right: "2ch" }} type="primary" icon={<SolutionOutlined />} onClick={() => {window.open(this.state.challengeWriteup)}}/>
                </Tooltip>
              )}
              {this.state.challengeWriteup === "" && (
                <Tooltip title="Writeups are not available for this challenge">
                  <Button disabled shape="circle" size="large" style={{ position: "absolute", right: "2ch" }} type="primary" icon={<SolutionOutlined />} />
                </Tooltip>
              )}
              <h1 style={{ fontSize: "150%" }}>{this.state.viewingChallengeDetails.name}</h1>
              <div>
                {this.state.challengeTags}
              </div>
              <h2 style={{ color: "#1765ad", marginTop: "2vh", marginBottom: "6vh", fontSize: "200%" }}>{this.state.viewingChallengeDetails.points}</h2>
              <JsxParser
                bindings={{
                  atomDark: atomDark
                }}
                components={{ SyntaxHighlighter }}
                jsx={this.state.viewingChallengeDetails.description}
              />


              <div style={{ marginTop: "6vh", display: "flex", flexDirection: "column" }}>
                {this.state.challengeHints}
              </div>


              <div style={{ display: "flex" }}>
                <SubmitFlagForm submitFlag={this.submitFlag.bind(this)} currentChallengeStatus={this.state.currentChallengeStatus} currentChallengeSolved={this.state.currentChallengeSolved}></SubmitFlagForm>
              </div>
              <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginTop: "-1vh" }}>
                <p>Challenge Author: <em>{this.state.viewingChallengeDetails.author}</em></p>
                <p style={{ color: "#d87a16", fontWeight: 500 }}>Attempts Remaining: {this.state.viewingChallengeDetails.max_attempts}</p>
              </div>
            </TabPane>
            <TabPane
              tab={<span><UnlockOutlined /> Solves ({this.state.viewingChallengeDetails.solves.length}) </span>}
              key="solves"
            >
              <List
                itemLayout="horizontal"
                dataSource={this.state.viewingChallengeDetails.solves}
                locale={{
                  emptyText: (
                    <div>
                      <SmileOutlined style={{ fontSize: "500%" }} />
                      <br />
                      <br />
                      <p style={{ fontSize: "150%" }}>No solves yet. Maybe you can be the first!</p>
                    </div>
                  )
                }}
                renderItem={item => {
                  return (
                    <List.Item key={item}>
                      <List.Item.Meta
                        avatar={<Avatar src="https://www.todayifoundout.com/wp-content/uploads/2017/11/rick-astley.png" />}
                        title={<Link to={"/Profile/" + item}><a style={{ fontSize: "110%", fontWeight: 700 }} onClick={() => { this.setState({ challengeModal: false }) }}>{item}</a></Link>}
                      />
                    </List.Item>
                  )
                }
                } />
            </TabPane>
          </Tabs>


        </Modal>

        {this.state.tag && (
          <ChallengesTagSortList tag={this.state.tag} loadChallengeDetails={this.loadChallengeDetails.bind(this)} loadingChallenge={this.state.loadingChallenge} currentChallenge={this.state.currentChallenge} />
        )}
      </Layout>

    );
  }
}

export default ChallengesTagSort;