# Prose anti-patterns

Each item is a failure mode of study abstracts. The reason is the part that matters.

- **NEVER stack bare acronyms in the opening.** A parenthetical tag cannot be reviewed with the source closed. The reader has to rebuild the meaning from a slide they do not have. Say what each one reads. The pair below is the test. Write it in the output language. Do not copy the English into a non-English abstract.

  Names the terms and stops:

  ```markdown
  Three architectures: CNN, RNN/LSTM, and RBM. A CNN stacks convolution, ReLU, pooling, and softmax.
  ```

  The first sentence is a list. The second names four stages and does not say what each stage does to the data. A reader cannot answer "what does pooling do?" from it.

  Each term says what it does:

  ```markdown
  The lecture uses three architectures. A convolutional network (CNN) reads data on a grid, such as an image. A recurrent network (RNN) reads a sequence and reuses the same weights at each step; LSTM is the variant built for long gaps. A restricted Boltzmann machine (RBM) uses stochastic neurons.

  In a CNN, convolution applies a filter, ReLU zeroes the negative values, pooling shrinks the grid, flattening turns the grid into a vector, and softmax turns the outputs into values between 0 and 1 that sum to 1.
  ```

  The acronym arrives after the full name, once. Each stage has a verb and an object. The same test applies to every sentence in Key concepts.

- **NEVER use `→` as the verb of a sentence.** The reader has to speak the line back. An arrow chain cannot be spoken, so it cannot be recalled.
- **NEVER lead with a mnemonic.** The slogan is what sticks, and the list under it drifts. A heading `PC³DPS` followed by a table that orders the words differently teaches the slogan, not the ideas. Expand the words first. Use a mnemonic only after the list is already in that order.
- **NEVER silently repair the source.** A question can ask for the sentence the source printed. Merging that sentence with a correction makes both unanswerable, because the reader can no longer tell which wording was asked for.
- **NEVER import a year, a formula, a count, or a walkthrough from another document to complete this one.** A second text that lists eight properties does not correct a source that lists six. Importing the eight rewrites the source under review and produces a confident answer to the wrong text.
- **NEVER fill a figure you have not opened.** Timeline years and table cells are often images. An invented cell becomes a false study answer that the reader will memorize.
- **NEVER promote one run to a property of the dataset.** The next run differs. An unlabeled percentage is remembered as a fact about the data rather than a fact about that execution.
- **NEVER invent the update rule of a method the source only names.** Naming a method and withholding the formula is the source's choice. A formula supplied from memory is a second document, presented as if this one had said it.
- **NEVER draw a diagram arrow that is not a dependency in the source.** An arrow from the actuators to the program teaches the reader that the program is a consequence of the actuators. The source never said that. Delete the arrow.
- **NEVER switch the abstract to the source language, or to English by habit, when the user wrote in another language or named one.** The source language is evidence about the source, not a choice about the reader.
- **NEVER split one unit into an abstract per incidental file, and NEVER collapse a set of units into one abstract unless the user asked for a single review.** A figure file is not a unit. A lecture is. Collapsing six lectures hides the boundary the reader has to study.
