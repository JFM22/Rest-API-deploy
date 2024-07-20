const express = require('express') //require -> CommonJS
const z = require('zod')
const crypto = require('node:crypto')
const movies = require('./movies.json')
const {validateMovie, validatePartialMovie} = require("./validaciones")

const app = express()
app.use(express.json())
app.disable('x-powered-by')

const ACCEPTED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:1234',
]
app.get('/', (req, res) => {
    res.json({message: 'hola mundo'})
})

app.get('/movies', (req,res) => {
 
    const origin = req.header('origin')
    if (ACCEPTED_ORIGINS.includes(origin) || !origin){
        res.header('Access-Control-Allow-origin', origin)
    }

    const { genre } = req.query

    if(genre) {
        const filteredMovies = movies.filter(
            movie => movie.genre.some(g => g.toLowerCase() == genre.toLocaleLowerCase())
            )
        return res.json(filteredMovies)
    }
    return res.json(movies)
})

app.get('/movies/:id', (req, res) => { 
    const {id} = req.params
    const movie = movies.find(movie => movie.id==id)
    if (movie) return res.json(movie)

    res.status(404).json({message: 'Movie not found'})

})
app.post('/movies', (req, res) => {

    const movieSchema = z.object({ 
        title: z.string({ 
            invalid_type_error: 'Movie title must be a string', 
            required_error: 'Movie title is required' 
        }),
        year: z.number().int().positive().min(1900).max(2024),
        director: z.string(),
        duration: z.number().int().positive(),
        rate: z.number().min(0).max(10).default(5), 
        
        poster: z.string().url({ 
            message: 'poster must be a valid URL'
        }).endsWith('.jpg'),

        genre: z.array(
            z.enum(['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror','Thriller','Sci-Fi']),
            { 
                required_error: 'Movie genre is required',
                invalid_type_error: 'Movie genre must be an array of enum Genre'
            }
        )
    })
    const result = validateMovie(req.body)
    if (result.error) { 
        return res.status(400).json({error: JSON.parse(result.error.message)}) 
    }

    const newMovie = {
        id: crypto.randomUUID(), 
        ...result.data 
    }

    movies.push(newMovie)
    fs.writeFile('movies.json', JSON.stringify(movies, null, 2), err => {
        if (err) { 
            console.error('Error al guardar la película:', err);
            res.status(500).send('Error interno del servidor');
        } else {
            console.log('Película añadida con éxito');
            res.status(201).json(newMovie) 
    }})
})

app.delete('/movies/:id', (req, res) => {
    const origin = req.header('origin') 
    if (ACCEPTED_ORIGINS.includes(origin) || !origin){
        res.header('Access-Control-Allow-origin', origin) 
    }

    const {id} = req.params
    const movieIndex = movies.findIndex(movie => movie.id == id)

    if(movieIndex == -1){
        return res.status(404).json({message: 'movie not found'})
    }

    movies.splice(movieIndex, 1) 
    return res.status(204).json({message:'Movie deleted'})
})

app.options('/movies/:id', (req,res) => {
    const origin = req.header('origin')
    if (ACCEPTED_ORIGINS.includes(origin) || !origin){
        res.header('Access-Control-Allow-origin', origin)
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
    }
    res.send(200) 
})
 
 app.patch('/movies/:id', (req, res) => {
    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id == id) 
    if (movieIndex == -1) return res.status(404).json({ message: 'Movie not found'})
    const movie = movies[movieIndex]

    const result = validatePartialMovie(req.body)
    if(!result.success){
        return res.status(400).json({error: JSON.parse(result.error.message)})
    }

    const updateMovie = { 
        ...movies[movieIndex], 
        ...result.data 
    }
    movies[movieIndex] = updateMovie
    return res.json(updateMovie)
 })

const PORT = process.env.PORT ?? 1234

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`)
})
