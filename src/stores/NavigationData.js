import { action, computed, observable } from 'mobx'

// NOTE -- this is admittedly not very reacty. Navigation is basically just
//         using CSS to show the appropriate section.slide at a given time.
//         It's nicely wired up with he browser's forward/back buttons, but
//         the entire questionaire is still rendered and made invisible.
//         This has the advantage of keeping navigation simple (out of
//         react/mobx land), making debugging easier (see the whole flow
//         but entering a magic hash: http://localhost:3000/#debug/), and
//         making slide transitions fast (since the next slide is already
//         rendered) at the expense of making some UI interactions that
//         modify observable data slower (as rendering happens at that time),
//         though in practice it's not really noticable.
//
//         The only issue with this system is that it's possible for a user
//         to get into a bad state using the browser's native Forward button
//         after going back to make a change that modifies downstream parts
//         of the application flow. In such a case, a new "forward path"
//         should be created but the old "forward path" is still in the
//         browser's history.
export default class NavigationData {
  @observable stepsCompleted = null
  @observable currentSlideIndex = 0

  constructor() {
    this.CURRENT_CLASS_NAME = 'current'
    this.history = []

    // Workaround for event.newURL and event.oldURL:
    // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onhashchange
    if (!window.HashChangeEvent) (function() {
      var lastURL=document.URL;
      window.addEventListener('hashchange', function(event){
        Object.defineProperty(event, 'oldURL', {
          enumerable: true,
          configurable: true,
          value: lastURL
        })
        Object.defineProperty(event, 'newURL', {
          enumerable: true,
          configurable: true,
          value: document.URL
        })
        lastURL = document.URL
      })
    }())

    this.handleHashChange = this.handleHashChange.bind(this)
    window.onhashchange = this.handleHashChange
  }

  get slides() {
    return document.getElementsByClassName('slide')
  }

  get currentSlide() {
    return this.slides[this.currentSlideIndex]
  }

  get nextSlide() {
    const slides = this.slides

    for (let i = 0; i < slides.length; i++) {
      // the current slide
      for (let j = 0; j < slides[i].classList.length; j++) {
        let className = slides[i].classList[j]

        if (className === this.CURRENT_CLASS_NAME) {
          if (i === slides.length - 1) {
            // final slide -- no next
            return null
          } else {
            return slides[i + 1]
          }
        }
      }
    }

    // nothing is current -- the first slide should be next
    return slides[0]
  }

  get firstIncompleteSlide() {
    const slides = this.slides

    for (let i = 0; i < slides.length; i++) {
      let slide = slides[i]

      if (slide.hasAttribute('data-incomplete')) {
        return slide
      }
    }
  }

  get jumpSlide() {
    return this.firstIncompleteSlide
  }

  get canJump() {
    // TODO: complete feature -- difficulties include:
    //  * when to allow jumping (only once Summary is reached?)
    //  * which slides may be jumped (all but those with "next" disabled?)
    //  * how to implement given disconnect of mobx land and navigation land
    return false
  }

  @action reflectProgress(slide) {
    const slides = this.slides
    let sectionBeginningsSeen = 0
    let slidesSeen = 0

    for (let i = 0; i < slides.length; i++) {
      if (slides[i].hasAttribute('data-begins-section')) {
        sectionBeginningsSeen++
      }

      if (slide == slides[i]) {
        break
      }

      slidesSeen++
    }

    this.stepsCompleted = sectionBeginningsSeen - 1
    this.currentSlideIndex = slidesSeen
  }

  @action goToSlide(id) {
    const slides = this.slides
    const re = new RegExp(this.CURRENT_CLASS_NAME, 'g') // TODO: imperfect

    for (let i = 0; i < slides.length; i++) {
      let slide = slides[i]

      if (slide.id === id || id === 'debug') {
        slide.className += ' ' + this.CURRENT_CLASS_NAME
        this.reflectProgress(slide)
      } else {
        slide.className = slide.className.replace(re, '')
      }
    }

    window.scrollTo(0, 0)
  }

  handleHashChange(event) {
    let newId = (event.newURL.split('#')[1] || '/').substr(1)
    newId = newId || this.slides[0].id // root (no hash)

    this.goToSlide(newId)
  }

  @action init() {
    if (window.location.hash === '#/')
      window.location.hash = '#'
    else
      window.location.hash = '#/'
  }

  @action back() {
    window.history.back()
  }

  @action next() {
    window.location.hash = '#/' + this.nextSlide.id
  }

  @action jump() {
    window.location.hash = '#/' + this.jumpSlide.id
  }
}
